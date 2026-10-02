/**
 * Invoice detail screen — full implementation.
 * Replaces the "Phase 1 placeholder" that had no buttons.
 *
 * Features: edit, download PDF, print, send (WhatsApp/email),
 * mark paid, record payment, delete.
 */
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiPatch, apiPost, apiDelete } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { API_BASE_URL } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const [inv, setInv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ invoice: any }>(`/api/invoices/${params.id}`);
      setInv(r.invoice);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid() {
    setBusy(true);
    try {
      await apiPatch(`/api/invoices/${params.id}`, { status: "PAID" });
      await load();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    Alert.prompt("Record Payment", "Enter payment amount:", async (text) => {
      const amount = parseFloat(text);
      if (!amount || amount <= 0) return;
      setBusy(true);
      try {
        await apiPost(`/api/invoices/${params.id}/pay`, { amount, method: "MANUAL" });
        await load();
      } catch (e: any) {
        Alert.alert("Failed", e.message);
      } finally {
        setBusy(false);
      }
    });
  }

  async function downloadPDF() {
    const url = `${API_BASE_URL}/api/quote-flow/invoices/${params.id}/pdf?download=1`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open PDF"));
  }

  async function printPDF() {
    const url = `${API_BASE_URL}/api/quote-flow/invoices/${params.id}/pdf`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open PDF for printing"));
  }

  async function shareInvoice() {
    if (!inv) return;
    const portalUrl = `${API_BASE_URL}/doc/${inv.id}`;
    const pdfUrl = `${API_BASE_URL}/api/quote-flow/invoices/${inv.id}/pdf?download=1`;
    const message = `Invoice ${inv.number} from ${business?.name || "your business"}.\n\nAmount: ${formatCurrency(inv.total || 0, business?.currency, business?.currencySymbol)}\n\nView online: ${portalUrl}\nDownload PDF: ${pdfUrl}`;
    try {
      await Share.share({ message });
    } catch {
      // User cancelled or share failed
    }
  }

  async function remove() {
    Alert.alert("Delete Invoice", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiDelete(`/api/invoices/${params.id}`);
            router.back();
          } catch (e: any) {
            Alert.alert("Failed", e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!inv) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.emptyText}>Invoice not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const items = inv.items || [];
  const paidAmount = (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  const balance = Math.max(0, (inv.total || 0) - paidAmount);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1c1917" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Invoice {inv.number}</Text>
        <TouchableOpacity onPress={remove}>
          <MaterialIcons name="delete-outline" size={24} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.badge, inv.status === "PAID" && styles.badgePaid]}>
            <Text style={[styles.badgeText, inv.status === "PAID" && styles.badgeTextPaid]}>
              {inv.status?.toLowerCase().replace("_", " ")}
            </Text>
          </View>
          {inv.dueDate && (
            <Text style={styles.dueDate}>
              Due {new Date(inv.dueDate).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Customer</Text>
          <Text style={styles.cardValue}>{inv.customer?.name || "—"}</Text>
          {inv.customer?.email ? <Text style={styles.cardSub}>{inv.customer.email}</Text> : null}
          {inv.customer?.phone ? <Text style={styles.cardSub}>{inv.customer.phone}</Text> : null}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Items</Text>
          {items.map((it: any, i: number) => (
            <View key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDesc}>{it.description}</Text>
                <Text style={styles.itemQty}>
                  {it.qty} × {formatCurrency(it.unitPrice, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
              <Text style={styles.itemAmount}>
                {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(inv.subtotal || 0, business?.currency, business?.currencySymbol)}
            </Text>
          </View>
          {inv.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(inv.discount || 0, business?.currency, business?.currencySymbol)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({inv.taxRate || 0}%)</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(inv.tax || 0, business?.currency, business?.currencySymbol)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(inv.total || 0, business?.currency, business?.currencySymbol)}
            </Text>
          </View>
          {paidAmount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid</Text>
                <Text style={[styles.totalValue, { color: "#10b981" }]}>
                  {formatCurrency(paidAmount, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
              {balance > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Balance Due</Text>
                  <Text style={[styles.totalValue, { color: "#dc2626" }]}>
                    {formatCurrency(balance, business?.currency, business?.currencySymbol)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/invoice-edit?id=${params.id}`)}
        >
          <MaterialIcons name="edit" size={18} color="#1c1917" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        {inv.status !== "PAID" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={markPaid}
            disabled={busy}
          >
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Mark Paid</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={downloadPDF}>
          <MaterialIcons name="download" size={18} color="#1c1917" />
          <Text style={styles.actionBtnText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={printPDF}>
          <MaterialIcons name="print" size={18} color="#1c1917" />
          <Text style={styles.actionBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={shareInvoice}>
          <MaterialIcons name="share" size={18} color="#1c1917" />
          <Text style={styles.actionBtnText}>Send</Text>
        </TouchableOpacity>
        {busy && <ActivityIndicator size="small" color="#10b981" style={{ marginLeft: 8 }} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  scroll: { flex: 1 },
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  badge: {
    backgroundColor: "#f5f5f4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePaid: { backgroundColor: "#d1fae5" },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#78716c", textTransform: "capitalize" },
  badgeTextPaid: { color: "#059669" },
  dueDate: { fontSize: 12, color: "#78716c" },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardLabel: { fontSize: 10, fontWeight: "600", color: "#a8a29e", textTransform: "uppercase", marginBottom: 4 },
  cardValue: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  cardSub: { fontSize: 12, color: "#78716c", marginTop: 2 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f4",
  },
  itemDesc: { fontSize: 13, color: "#1c1917", fontWeight: "500" },
  itemQty: { fontSize: 11, color: "#78716c", marginTop: 2 },
  itemAmount: { fontSize: 13, color: "#1c1917", fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: { fontSize: 13, color: "#78716c" },
  totalValue: { fontSize: 13, color: "#1c1917", fontWeight: "500" },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: "#10b981",
    marginTop: 8,
    paddingTop: 10,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: "700", color: "#1c1917" },
  grandTotalValue: { fontSize: 15, fontWeight: "700", color: "#1c1917" },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f4",
  },
  actionPrimary: { backgroundColor: "#10b981" },
  actionBtnText: { fontSize: 11, fontWeight: "600", color: "#1c1917" },
  emptyText: { fontSize: 14, color: "#78716c" },
  link: { fontSize: 14, color: "#2563eb", marginTop: 8 },
});

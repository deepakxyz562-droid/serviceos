/**
 * Invoice detail / Preview screen — 1:1 match with Invoice Maker reference (preview.jpeg & preview-share.jpeg).
 * Features:
 * - A4 visual document sheet preview with template styling & zoom toggle
 * - Floating bottom summary card (Due date, Amount, Client, Status & Delivery badges)
 * - Large primary "Send Invoice" button (WhatsApp/Email/Native Share)
 * - 4-Action quick bar: Download (via FileSystem), Print, Edit, More
 * - Bottom action sheet modal (Customize, Share, Create Invoice, Duplicate, Convert to Estimate, Feedback, Delete)
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
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAppStore } from "@/store/app";
import { api, apiPatch, apiPost, apiDelete, API_BASE_URL } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";

// Helper to resolve template accent color
function getTemplateAccent(templateId?: string | null): string {
  if (!templateId) return "#2563eb";
  const id = templateId.includes(":") ? templateId.split(":").pop()! : templateId;
  const colors: Record<string, string> = {
    modern: "#2563eb",
    simple: "#374151",
    professional: "#1e40af",
    elegant: "#7c3aed",
    minimal: "#171717",
    bold: "#dc2626",
    corporate: "#0284c7",
    editorial: "#b45309",
    creative: "#9333ea",
    compact: "#475569",
    classic: "#4b5563",
    international: "#059669",
  };
  return colors[id] || "#2563eb";
}

export default function InvoicePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const [inv, setInv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [moreModalVisible, setMoreModalVisible] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ invoice: any }>(`/api/invoices/${params.id}`);
      setInv(r.invoice);
    } catch {
      Alert.alert("Error", "Could not load invoice");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Download PDF locally via FileSystem and open native share/save sheet
  async function downloadPDF() {
    if (!inv) return;
    setBusy(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/quote-flow/invoices/${inv.id}/pdf?download=1`;
      if (Platform.OS === "web") {
        Linking.openURL(pdfUrl);
        return;
      }
      const localUri = `${FileSystem.documentDirectory}${inv.number}.pdf`;
      const downloadRes = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Save Invoice ${inv.number}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Invoice saved to ${downloadRes.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Download failed", e.message || "Could not download PDF");
    } finally {
      setBusy(false);
    }
  }

  // Print PDF via native print / share
  async function printPDF() {
    if (!inv) return;
    setBusy(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/quote-flow/invoices/${inv.id}/pdf`;
      if (Platform.OS === "web") {
        window.open(pdfUrl, "_blank");
        return;
      }
      const localUri = `${FileSystem.documentDirectory}${inv.number}-print.pdf`;
      const downloadRes = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Print Invoice ${inv.number}`,
        });
      } else {
        Linking.openURL(pdfUrl);
      }
    } catch (e: any) {
      Alert.alert("Print failed", e.message || "Could not print PDF");
    } finally {
      setBusy(false);
    }
  }

  // Share invoice (native share)
  async function shareInvoice() {
    if (!inv) return;
    const portalUrl = `${API_BASE_URL}/doc/${inv.id}`;
    const pdfUrl = `${API_BASE_URL}/api/quote-flow/invoices/${inv.id}/pdf?download=1`;
    const message = `Invoice ${inv.number} from ${business?.name || "our company"}\nTotal: ${formatCurrency(
      inv.total || 0,
      business?.currency,
      business?.currencySymbol
    )}\n\nView online: ${portalUrl}\nDownload PDF: ${pdfUrl}`;

    try {
      if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
        const localUri = `${FileSystem.documentDirectory}${inv.number}.pdf`;
        const res = await FileSystem.downloadAsync(pdfUrl, localUri).catch(() => null);
        if (res?.uri) {
          await Sharing.shareAsync(res.uri, {
            mimeType: "application/pdf",
            dialogTitle: `Share Invoice ${inv.number}`,
          });
          return;
        }
      }
      await Share.share({ message, title: `Invoice ${inv.number}` });
    } catch {
      // User cancelled
    }
  }

  // Send via WhatsApp
  function sendWhatsApp() {
    if (!inv) return;
    const portalUrl = `${API_BASE_URL}/doc/${inv.id}`;
    const phone = (inv.customer?.phone || "").replace(/[^0-9+]/g, "");
    const text = encodeURIComponent(
      `Hi ${inv.customer?.name || "Customer"},\n\nHere is Invoice ${inv.number} for ${formatCurrency(
        inv.total || 0,
        business?.currency,
        business?.currencySymbol
      )} from ${business?.name || "our company"}.\n\nView invoice: ${portalUrl}`
    );
    const url = phone ? `whatsapp://send?phone=${phone}&text=${text}` : `whatsapp://send?text=${text}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone ? phone : ""}?text=${text}`).catch(() => {
        Alert.alert("Error", "Could not open WhatsApp");
      });
    });
  }

  // Duplicate invoice
  async function duplicateInvoice() {
    if (!inv) return;
    setMoreModalVisible(false);
    setBusy(true);
    try {
      const items = (inv.items || []).map((it: any) => ({
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
      }));
      const r = await apiPost<{ invoice: any }>("/api/invoices", {
        customerId: inv.customerId,
        items,
        discountValue: inv.discountValue,
        discountType: inv.discountType,
        taxRate: inv.taxRate,
        notes: inv.notes,
        pdfTemplate: inv.pdfTemplate,
      });
      router.replace(`/invoice/${r.invoice.id}`);
      Alert.alert("Success", `Created duplicate invoice ${r.invoice.number}`);
    } catch (e: any) {
      Alert.alert("Duplicate failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  // Convert to Quote / Estimate
  async function convertToEstimate() {
    if (!inv) return;
    setMoreModalVisible(false);
    setBusy(true);
    try {
      const items = (inv.items || []).map((it: any) => ({
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
      }));
      const r = await apiPost<{ quote: any }>("/api/quotes", {
        customerId: inv.customerId,
        items,
        discountValue: inv.discountValue,
        discountType: inv.discountType,
        taxRate: inv.taxRate,
        notes: inv.notes,
        pdfTemplate: inv.pdfTemplate,
      });
      router.push(`/quote/${r.quote.id}`);
      Alert.alert("Converted", `Created estimate ${r.quote.number}`);
    } catch (e: any) {
      Alert.alert("Conversion failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  // Delete invoice
  async function remove() {
    setMoreModalVisible(false);
    Alert.alert("Delete Invoice", `Are you sure you want to delete ${inv?.number}?`, [
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
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!inv) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.errorText}>Invoice not found</Text>
        <TouchableOpacity style={styles.btnOutline} onPress={() => router.back()}>
          <Text style={styles.btnOutlineText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const items = inv.items || [];
  const accentColor = getTemplateAccent(inv.pdfTemplate);
  const paidAmount = (inv.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const balance = Math.max(0, (inv.total || 0) - paidAmount);
  const isPaid = inv.status === "PAID" || balance === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{inv.number}</Text>
        </View>
        <View style={styles.headerRight}>
          <FontAwesome5 name="crown" size={18} color="#f59e0b" style={{ marginRight: 16 }} />
          <TouchableOpacity onPress={shareInvoice} style={styles.headerBtn}>
            <Feather name="share-2" size={20} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main A4 Document Sheet Viewport */}
      <ScrollView
        style={styles.previewContainer}
        contentContainerStyle={[styles.previewContent, zoomed && styles.previewContentZoomed]}
        showsVerticalScrollIndicator={false}
      >
        {/* Floating Zoom Button */}
        <TouchableOpacity
          style={styles.zoomFab}
          onPress={() => setZoomed(!zoomed)}
          activeOpacity={0.8}
        >
          <MaterialIcons name={zoomed ? "zoom-out" : "zoom-in"} size={22} color="#1e293b" />
        </TouchableOpacity>

        {/* The White Document Sheet (matches preview.jpeg) */}
        <View style={[styles.documentSheet, zoomed && styles.documentSheetZoomed]}>
          {/* Document Header */}
          <View style={styles.docHeaderRow}>
            <View style={styles.docBusinessCol}>
              {business?.name ? <Text style={styles.docBusinessName}>{business.name}</Text> : null}
              {business?.email ? <Text style={styles.docMetaText}>{business.email}</Text> : null}
              {business?.phone ? <Text style={styles.docMetaText}>{business.phone}</Text> : null}
            </View>
            <View style={styles.docTitleCol}>
              <Text style={[styles.docTitle, { color: accentColor }]}>INVOICE</Text>
            </View>
          </View>

          {/* Two-Column Info Bar */}
          <View style={styles.docInfoBar}>
            <View style={styles.docBillToCol}>
              <Text style={styles.docSectionLabel}>BILL TO</Text>
              <Text style={styles.docClientName}>{inv.customer?.name || "Unknown Client"}</Text>
              {inv.customer?.address ? (
                <Text style={styles.docMetaText}>{inv.customer.address}</Text>
              ) : null}
              {inv.customer?.phone ? (
                <Text style={styles.docMetaText}>{inv.customer.phone}</Text>
              ) : null}
            </View>

            <View style={styles.docMetaCol}>
              <View style={styles.docMetaRow}>
                <Text style={styles.docMetaLabel}>INVOICE #</Text>
                <Text style={styles.docMetaVal}>{inv.number}</Text>
              </View>
              <View style={styles.docMetaRow}>
                <Text style={styles.docMetaLabel}>DATE</Text>
                <Text style={styles.docMetaVal}>
                  {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-GB")}
                </Text>
              </View>
              <View style={styles.docMetaRow}>
                <Text style={styles.docMetaLabel}>DUE DATE</Text>
                <Text style={styles.docMetaVal}>
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "On receipt"}
                </Text>
              </View>
            </View>
          </View>

          {/* Styled Items Table */}
          <View style={styles.table}>
            <View style={[styles.tableHeader, { backgroundColor: accentColor }]}>
              <Text style={[styles.tableColHeader, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableColHeader, { width: 45, textAlign: "center" }]}>QTY</Text>
              <Text style={[styles.tableColHeader, { width: 70, textAlign: "right" }]}>Price</Text>
              <Text style={[styles.tableColHeader, { width: 80, textAlign: "right" }]}>Amount</Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyItemsRow}>
                <Text style={styles.emptyItemsText}>No items added</Text>
              </View>
            ) : (
              items.map((it: any, i: number) => (
                <View
                  key={i}
                  style={[styles.tableRow, i % 2 === 1 && { backgroundColor: "#f8fafc" }]}
                >
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: "500" }]}>
                    {it.description}
                  </Text>
                  <Text style={[styles.tableCell, { width: 45, textAlign: "center" }]}>
                    {it.qty}
                  </Text>
                  <Text style={[styles.tableCell, { width: 70, textAlign: "right" }]}>
                    {formatCurrency(it.unitPrice, business?.currency, business?.currencySymbol)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: 80, textAlign: "right", fontWeight: "600" },
                    ]}
                  >
                    {formatCurrency(
                      it.qty * it.unitPrice,
                      business?.currency,
                      business?.currencySymbol
                    )}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Totals Summary */}
          <View style={styles.docSummaryWrap}>
            <View style={styles.docSummaryCol}>
              <View style={styles.docSummaryRow}>
                <Text style={styles.docSummaryLabel}>Subtotal</Text>
                <Text style={styles.docSummaryVal}>
                  {formatCurrency(inv.subtotal || 0, business?.currency, business?.currencySymbol)}
                </Text>
              </View>

              {inv.discount > 0 && (
                <View style={styles.docSummaryRow}>
                  <Text style={styles.docSummaryLabel}>Discount</Text>
                  <Text style={styles.docSummaryVal}>
                    -
                    {formatCurrency(
                      inv.discount || 0,
                      business?.currency,
                      business?.currencySymbol
                    )}
                  </Text>
                </View>
              )}

              {inv.tax > 0 && (
                <View style={styles.docSummaryRow}>
                  <Text style={styles.docSummaryLabel}>Tax ({inv.taxRate || 0}%)</Text>
                  <Text style={styles.docSummaryVal}>
                    {formatCurrency(inv.tax || 0, business?.currency, business?.currencySymbol)}
                  </Text>
                </View>
              )}

              <View style={styles.docSummaryRow}>
                <Text style={[styles.docSummaryLabel, { fontWeight: "700" }]}>Total</Text>
                <Text style={[styles.docSummaryVal, { fontWeight: "700" }]}>
                  {formatCurrency(inv.total || 0, business?.currency, business?.currencySymbol)}
                </Text>
              </View>

              {paidAmount > 0 && (
                <View style={styles.docSummaryRow}>
                  <Text style={styles.docSummaryLabel}>Paid</Text>
                  <Text style={[styles.docSummaryVal, { color: "#10b981" }]}>
                    {formatCurrency(paidAmount, business?.currency, business?.currencySymbol)}
                  </Text>
                </View>
              )}

              {/* Balance Due Banner */}
              <View style={[styles.balanceDueBanner, { backgroundColor: accentColor }]}>
                <Text style={styles.balanceDueText}>BALANCE DUE</Text>
                <Text style={styles.balanceDueAmount}>
                  {formatCurrency(balance, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
            </View>
          </View>

          {/* PAID Stamp Overlay (if paid) */}
          {isPaid && (
            <View style={styles.paidWatermarkStamp}>
              <Text style={styles.paidWatermarkText}>PAID</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Summary & Action Sheet (matches preview.jpeg) */}
      <View style={styles.bottomCardContainer}>
        {/* Due date, total amount, client name, badges */}
        <View style={styles.bottomSummaryRow}>
          <View style={styles.bottomSummaryLeft}>
            <Text style={styles.bottomDueDate}>
              Due on {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "Receipt"}
            </Text>
            <Text style={styles.bottomTotalAmount}>
              {formatCurrency(inv.total || 0, business?.currency, business?.currencySymbol)}
            </Text>
            <Text style={styles.bottomClientName}>
              {inv.customer?.name || "Unknown Client"}
            </Text>
          </View>

          <View style={styles.bottomSummaryRight}>
            <View style={[styles.pillBadge, isPaid ? styles.pillPaid : styles.pillUnpaid]}>
              <Text style={[styles.pillText, isPaid ? styles.pillTextPaid : styles.pillTextUnpaid]}>
                {isPaid ? "Paid" : "Unpaid"}
              </Text>
            </View>
            <View style={[styles.pillBadge, styles.pillDelivery]}>
              <Text style={styles.pillTextDelivery}>Not sent</Text>
            </View>
          </View>
        </View>

        {/* Primary Send Button */}
        <TouchableOpacity
          style={[styles.primarySendBtn, { backgroundColor: "#2563eb" }]}
          onPress={() => setSendModalVisible(true)}
          activeOpacity={0.85}
        >
          <Feather name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.primarySendBtnText}>Send Invoice</Text>
        </TouchableOpacity>

        {/* 4-Action Quick Bar */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionItem} onPress={downloadPDF}>
            <View style={styles.quickActionIconWrap}>
              <Feather name="download" size={20} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={printPDF}>
            <View style={styles.quickActionIconWrap}>
              <Feather name="printer" size={20} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Print</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => router.push(`/invoice-edit?id=${params.id}`)}
          >
            <View style={styles.quickActionIconWrap}>
              <Feather name="edit-3" size={20} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => setMoreModalVisible(true)}
          >
            <View style={styles.quickActionIconWrap}>
              <Feather name="more-horizontal" size={20} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>More</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* "⋯ More" Action Sheet Modal (1:1 match with preview-share.jpeg) */}
      <Modal
        visible={moreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMoreModalVisible(false)}
        >
          <View style={styles.actionSheetContent} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{inv.number}</Text>
              <TouchableOpacity
                onPress={() => setMoreModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Actions list */}
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMoreModalVisible(false);
                router.push(`/customize?id=${inv.id}&type=invoice`);
              }}
            >
              <MaterialIcons name="palette" size={22} color="#ec4899" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Customize</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMoreModalVisible(false);
                shareInvoice();
              }}
            >
              <Feather name="share-2" size={20} color="#3b82f6" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMoreModalVisible(false);
                router.push("/invoice-create");
              }}
            >
              <Feather name="plus-circle" size={20} color="#10b981" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Create Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={duplicateInvoice}>
              <Feather name="copy" size={20} color="#6366f1" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={convertToEstimate}>
              <Feather name="repeat" size={20} color="#8b5cf6" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Convert to Estimate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMoreModalVisible(false);
                Alert.alert("Feedback", "We would love to hear your feedback!", [
                  { text: "OK" },
                ]);
              }}
            >
              <Feather name="message-square" size={20} color="#06b6d4" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Feedback</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetRow, { borderBottomWidth: 0 }]} onPress={remove}>
              <Feather name="trash-2" size={20} color="#ef4444" style={styles.sheetIcon} />
              <Text style={[styles.sheetRowText, { color: "#ef4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* "Send Invoice" Modal */}
      <Modal
        visible={sendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSendModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSendModalVisible(false)}
        >
          <View style={styles.sendModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.sendModalTitle}>Send Invoice</Text>
            <Text style={styles.sendModalSub}>Choose how to dispatch this invoice to the client</Text>

            <TouchableOpacity
              style={styles.sendOptionBtn}
              onPress={() => {
                setSendModalVisible(false);
                sendWhatsApp();
              }}
            >
              <FontAwesome5 name="whatsapp" size={22} color="#25D366" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sendOptionTitle}>Send via WhatsApp</Text>
                <Text style={styles.sendOptionDesc}>Direct 1-tap message with portal link</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendOptionBtn}
              onPress={() => {
                setSendModalVisible(false);
                shareInvoice();
              }}
            >
              <Feather name="share-2" size={20} color="#2563eb" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sendOptionTitle}>Native Share Sheet</Text>
                <Text style={styles.sendOptionDesc}>Share PDF via Email, Messages, AirDrop</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnOutline, { marginTop: 16 }]}
              onPress={() => setSendModalVisible(false)}
            >
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Busy overlay */}
      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#eef2f6",
  },
  previewContent: {
    padding: 16,
    paddingBottom: 220,
    alignItems: "center",
  },
  previewContentZoomed: {
    padding: 8,
  },
  zoomFab: {
    position: "absolute",
    top: 24,
    right: 24,
    zIndex: 10,
    backgroundColor: "#ffffff",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  documentSheet: {
    width: "100%",
    maxWidth: 420,
    minHeight: 520,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  documentSheetZoomed: {
    maxWidth: "100%",
    transform: [{ scale: 1.05 }],
  },
  docHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  docBusinessCol: {
    flex: 1,
  },
  docBusinessName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  docTitleCol: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  docInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  docBillToCol: {
    flex: 1,
    paddingRight: 10,
  },
  docSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  docClientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  docMetaText: {
    fontSize: 11,
    color: "#64748b",
  },
  docMetaCol: {
    width: 140,
    alignItems: "flex-end",
  },
  docMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  docMetaLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  docMetaVal: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0f172a",
  },
  table: {
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: {
    fontSize: 11,
    color: "#1e293b",
  },
  emptyItemsRow: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyItemsText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  docSummaryWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  docSummaryCol: {
    width: 200,
  },
  docSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  docSummaryLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  docSummaryVal: {
    fontSize: 11,
    color: "#0f172a",
    fontWeight: "500",
  },
  balanceDueBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    borderRadius: 2,
  },
  balanceDueText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  balanceDueAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  paidWatermarkStamp: {
    position: "absolute",
    top: "40%",
    left: "25%",
    borderWidth: 4,
    borderColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ rotate: "-22deg" }],
    opacity: 0.85,
  },
  paidWatermarkText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#ef4444",
    letterSpacing: 3,
  },
  bottomCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  bottomSummaryLeft: {
    flex: 1,
  },
  bottomDueDate: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  bottomTotalAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  bottomClientName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  bottomSummaryRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillPaid: {
    backgroundColor: "#dcfce7",
  },
  pillUnpaid: {
    backgroundColor: "#e0e7ff",
  },
  pillDelivery: {
    backgroundColor: "#f1f5f9",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pillTextPaid: {
    color: "#15803d",
  },
  pillTextUnpaid: {
    color: "#4338ca",
  },
  pillTextDelivery: {
    fontSize: 11,
    color: "#64748b",
  },
  primarySendBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  primarySendBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 4,
  },
  quickActionItem: {
    alignItems: "center",
    width: 68,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#334155",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    position: "relative",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  sheetCloseBtn: {
    position: "absolute",
    right: 0,
    top: -2,
    padding: 6,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  sheetIcon: {
    width: 32,
    marginRight: 12,
  },
  sheetRowText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
  },
  sendModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: "auto",
    marginTop: "auto",
  },
  sendModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  sendModalSub: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
  },
  sendOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  sendOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  sendOptionDesc: {
    fontSize: 11,
    color: "#64748b",
  },
  btnOutline: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  errorText: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});

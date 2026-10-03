/**
 * Quote / Estimate preview screen — 1:1 match with Invoice Maker reference (preview.jpeg & preview-share.jpeg).
 * Features:
 * - A4 visual document sheet preview with template styling & zoom toggle
 * - Floating bottom summary card (Valid until date, Amount, Client, Status & Delivery badges)
 * - Large primary "Send Estimate" button (WhatsApp/Email/Native Share)
 * - 4-Action quick bar: Download (via FileSystem), Print, Edit, More
 * - Bottom action sheet modal (Customize, Share, Create Quote, Duplicate, Convert to Invoice, Feedback, Delete)
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
  Image,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAppStore } from "@/store/app";
import { api, apiPatch, apiPost, apiDelete, API_BASE_URL, loadToken } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";

// Unified Template Theme Resolver (maps catalog IDs + native IDs)
export interface TemplateTheme {
  id: string;
  name: string;
  accent: string;
  lightAccent: string;
  gridBorderColor: string;
}

export function getTemplateTheme(templateId?: string | null): TemplateTheme {
  const cleanId = (templateId || "soft-emerald-wave").includes(":")
    ? templateId!.split(":").pop()!
    : (templateId || "soft-emerald-wave");

  const map: Record<string, TemplateTheme> = {
    "classic-corporate-blue": {
      id: "classic-corporate-blue",
      name: "Corporate Blue",
      accent: "#2563eb",
      lightAccent: "#eff6ff",
      gridBorderColor: "#cbd5e1",
    },
    modern: {
      id: "modern",
      name: "Modern",
      accent: "#2563eb",
      lightAccent: "#eff6ff",
      gridBorderColor: "#cbd5e1",
    },
    "soft-emerald-wave": {
      id: "soft-emerald-wave",
      name: "Emerald Wave",
      accent: "#059669",
      lightAccent: "#ecfdf5",
      gridBorderColor: "#a7f3d0",
    },
    "geometric-bold-green": {
      id: "geometric-bold-green",
      name: "Bold Green",
      accent: "#10b981",
      lightAccent: "#ecfdf5",
      gridBorderColor: "#6ee7b7",
    },
    "slate-geometric": {
      id: "slate-geometric",
      name: "Slate Corporate",
      accent: "#1e293b",
      lightAccent: "#f1f5f9",
      gridBorderColor: "#94a3b8",
    },
    "minimal-clean": {
      id: "minimal-clean",
      name: "Minimal Clean",
      accent: "#18181b",
      lightAccent: "#f4f4f5",
      gridBorderColor: "#e4e4e7",
    },
    simple: {
      id: "simple",
      name: "Simple",
      accent: "#374151",
      lightAccent: "#f3f4f6",
      gridBorderColor: "#d1d5db",
    },
    "mesh-polygonal": {
      id: "mesh-polygonal",
      name: "Polygonal Mesh",
      accent: "#7c3aed",
      lightAccent: "#f5f3ff",
      gridBorderColor: "#ddd6fe",
    },
    creative: {
      id: "creative",
      name: "Creative",
      accent: "#9333ea",
      lightAccent: "#faf5ff",
      gridBorderColor: "#e9d5ff",
    },
    "golden-luxury": {
      id: "golden-luxury",
      name: "Golden Luxury",
      accent: "#d97706",
      lightAccent: "#fffbeb",
      gridBorderColor: "#fde68a",
    },
    professional: {
      id: "professional",
      name: "Professional",
      accent: "#1e40af",
      lightAccent: "#eff6ff",
      gridBorderColor: "#bfdbfe",
    },
    corporate: {
      id: "corporate",
      name: "Corporate",
      accent: "#0284c7",
      lightAccent: "#f0f9ff",
      gridBorderColor: "#bae6fd",
    },
    editorial: {
      id: "editorial",
      name: "Editorial",
      accent: "#b45309",
      lightAccent: "#fffbeb",
      gridBorderColor: "#fde68a",
    },
    classic: {
      id: "classic",
      name: "Classic",
      accent: "#1d4ed8",
      lightAccent: "#eff6ff",
      gridBorderColor: "#bfdbfe",
    },
    international: {
      id: "international",
      name: "International",
      accent: "#059669",
      lightAccent: "#ecfdf5",
      gridBorderColor: "#a7f3d0",
    },
    bold: {
      id: "bold",
      name: "Bold",
      accent: "#dc2626",
      lightAccent: "#fef2f2",
      gridBorderColor: "#fecaca",
    },
  };

  return map[cleanId] || map["soft-emerald-wave"];
}

export default function QuotePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const [quote, setQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [moreModalVisible, setMoreModalVisible] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ quote: any }>(`/api/quotes/${params.id}`);
      setQuote(r.quote);
    } catch {
      Alert.alert("Error", "Could not load quote");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Download PDF locally via FileSystem and open native share/save sheet
  async function downloadPDF() {
    if (!quote) return;
    setBusy(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/quote-flow/quotes/${quote.id}/pdf?download=1`;
      if (Platform.OS === "web") {
        Linking.openURL(pdfUrl);
        return;
      }
      const token = await loadToken();
      const localUri = `${FileSystem.documentDirectory}${quote.number}.pdf`;
      const downloadRes = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: token ? { "x-quoteflow-token": token } : undefined,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Save Quote ${quote.number}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Quote saved to ${downloadRes.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Download failed", e.message || "Could not download PDF");
    } finally {
      setBusy(false);
    }
  }

  // Print PDF via native print / share
  async function printPDF() {
    if (!quote) return;
    setBusy(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/quote-flow/quotes/${quote.id}/pdf`;
      if (Platform.OS === "web") {
        window.open(pdfUrl, "_blank");
        return;
      }
      const token = await loadToken();
      const localUri = `${FileSystem.documentDirectory}${quote.number}-print.pdf`;
      const downloadRes = await FileSystem.downloadAsync(pdfUrl, localUri, {
        headers: token ? { "x-quoteflow-token": token } : undefined,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Print Quote ${quote.number}`,
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

  // Share quote (native share)
  async function shareQuote() {
    if (!quote) return;
    const portalUrl = `${API_BASE_URL}/doc/${quote.id}`;
    const pdfUrl = `${API_BASE_URL}/api/quote-flow/quotes/${quote.id}/pdf?download=1`;
    const message = `Estimate ${quote.number} from ${business?.name || "our company"}\nTotal: ${formatCurrency(
      quote.total || 0,
      business?.currency,
      business?.currencySymbol
    )}\n\nView online: ${portalUrl}\nDownload PDF: ${pdfUrl}`;

    try {
      if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
        const localUri = `${FileSystem.documentDirectory}${quote.number}.pdf`;
        const res = await FileSystem.downloadAsync(pdfUrl, localUri).catch(() => null);
        if (res?.uri) {
          await Sharing.shareAsync(res.uri, {
            mimeType: "application/pdf",
            dialogTitle: `Share Estimate ${quote.number}`,
          });
          return;
        }
      }
      await Share.share({ message, title: `Estimate ${quote.number}` });
    } catch {
      // User cancelled
    }
  }

  // Send via WhatsApp
  function sendWhatsApp() {
    if (!quote) return;
    const portalUrl = `${API_BASE_URL}/doc/${quote.id}`;
    const phone = (quote.customer?.phone || "").replace(/[^0-9+]/g, "");
    const text = encodeURIComponent(
      `Hi ${quote.customer?.name || "Customer"},\n\nHere is Estimate ${quote.number} for ${formatCurrency(
        quote.total || 0,
        business?.currency,
        business?.currencySymbol
      )} from ${business?.name || "our company"}.\n\nView estimate: ${portalUrl}`
    );
    const url = phone ? `whatsapp://send?phone=${phone}&text=${text}` : `whatsapp://send?text=${text}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone ? phone : ""}?text=${text}`).catch(() => {
        Alert.alert("Error", "Could not open WhatsApp");
      });
    });
  }

  // Duplicate quote
  async function duplicateQuote() {
    if (!quote) return;
    setMoreModalVisible(false);
    setBusy(true);
    try {
      const items = (quote.items || []).map((it: any) => ({
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
      }));
      const r = await apiPost<{ quote: any }>("/api/quotes", {
        customerId: quote.customerId,
        items,
        discountValue: quote.discountValue,
        discountType: quote.discountType,
        taxRate: quote.taxRate,
        notes: quote.notes,
        pdfTemplate: quote.pdfTemplate,
      });
      router.replace(`/quote/${r.quote.id}`);
      Alert.alert("Success", `Created duplicate estimate ${r.quote.number}`);
    } catch (e: any) {
      Alert.alert("Duplicate failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  // Convert to Invoice
  async function convertToInvoice() {
    if (!quote) return;
    setMoreModalVisible(false);
    setBusy(true);
    try {
      const r = await apiPost<{ invoice: any; alreadyExists?: boolean }>(
        `/api/quotes/${params.id}/convert-to-invoice`,
        {}
      );
      router.push(`/invoice/${r.invoice.id}`);
      Alert.alert(
        r.alreadyExists ? "Already converted" : "Converted to Invoice",
        `Invoice ${r.invoice.number} is ready`
      );
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  // Delete quote
  async function remove() {
    setMoreModalVisible(false);
    Alert.alert("Delete Estimate", `Are you sure you want to delete ${quote?.number}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiDelete(`/api/quotes/${params.id}`);
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
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    );
  }

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/quotes");
    }
  }, [router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  if (!quote) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.errorText}>Estimate not found</Text>
        <TouchableOpacity style={styles.btnOutline} onPress={handleBack}>
          <Text style={styles.btnOutlineText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const items = quote.items || [];
  const theme = getTemplateTheme(quote.pdfTemplate);
  const isAccepted = quote.status === "ACCEPTED";

  // Extract currency overrides from quote notes metadata if set
  let quoteCurrency = business?.currency || "INR";
  let quoteCurrencySymbol = business?.currencySymbol || "₹";
  if (quote?.notes) {
    try {
      if (quote.notes.startsWith("{") && quote.notes.endsWith("}")) {
        const meta = JSON.parse(quote.notes);
        if (meta.currencyCode) quoteCurrency = meta.currencyCode;
        if (meta.currencySymbol) quoteCurrencySymbol = meta.currencySymbol;
      }
    } catch {}
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{quote.number}</Text>
        </View>
        <View style={styles.headerRight}>
          <FontAwesome5 name="crown" size={18} color="#f59e0b" style={{ marginRight: 16 }} />
          <TouchableOpacity onPress={shareQuote} style={styles.headerBtn}>
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
          <MaterialIcons name={zoomed ? "zoom-out" : "zoom-in"} size={20} color="#1e293b" />
        </TouchableOpacity>

        {/* The White Document Sheet (1:1 with media_1790971011559.jpg) */}
        <View style={[styles.documentSheet, zoomed && styles.documentSheetZoomed]}>
          {/* Document Header: Logo/BizName left, ESTIMATE right */}
          <View style={styles.sheetTopRow}>
            {business?.name ? (
              <View style={styles.sheetBizWrap}>
                {business.logoUrl ? (
                  <Image source={{ uri: business.logoUrl }} style={styles.sheetLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.sheetBizName}>{business.name}</Text>
                {business.email ? <Text style={styles.sheetMetaSub}>{business.email}</Text> : null}
              </View>
            ) : <View style={{ flex: 1 }} />}
            <Text style={[styles.docLargeTitle, { color: theme.accent }]}>ESTIMATE</Text>
          </View>

          {/* Thin horizontal divider rule */}
          <View style={[styles.sheetDivider, { backgroundColor: theme.accent, opacity: 0.3 }]} />

          {/* Two-Column Info Bar: ESTIMATE FOR on left, 2-column Metadata on right */}
          <View style={styles.docInfoBar}>
            {/* ESTIMATE FOR */}
            <View style={styles.docBillToCol}>
              <Text style={styles.docSectionLabel}>ESTIMATE FOR</Text>
              <Text style={styles.docClientName}>{quote.customer?.name || "Unknown Client"}</Text>
              {quote.customer?.address ? (
                <Text style={styles.docMetaText}>{quote.customer.address}</Text>
              ) : null}
              {quote.customer?.phone ? (
                <Text style={styles.docMetaText}>{quote.customer.phone}</Text>
              ) : null}
            </View>

            {/* Key-Value Metadata 2-Column Block */}
            <View style={styles.docMetaGrid}>
              <View style={styles.docMetaKeys}>
                <Text style={styles.docMetaLabel}>QUOTE #</Text>
                <Text style={styles.docMetaLabel}>DATE</Text>
                <Text style={styles.docMetaLabel}>VALID UNTIL</Text>
              </View>
              <View style={styles.docMetaValues}>
                <Text style={styles.docMetaVal}>{quote.number}</Text>
                <Text style={styles.docMetaVal}>
                  {new Date(quote.createdAt || Date.now()).toLocaleDateString("en-GB")}
                </Text>
                <Text style={styles.docMetaVal}>
                  {quote.validUntil
                    ? new Date(quote.validUntil).toLocaleDateString("en-GB")
                    : "30 days"}
                </Text>
              </View>
            </View>
          </View>

          {/* Styled Table Grid with Vertical Column Dividers */}
          <View style={[styles.tableGrid, { borderColor: theme.gridBorderColor }]}>
            {/* Header Row */}
            <View style={[styles.tableHeader, { backgroundColor: theme.accent }]}>
              <Text style={[styles.tableColHeader, styles.colDesc]}>Description</Text>
              <Text style={[styles.tableColHeader, styles.colQty]}>QTY</Text>
              <Text style={[styles.tableColHeader, styles.colPrice]}>Price</Text>
              <Text style={[styles.tableColHeader, styles.colAmount]}>Amount</Text>
            </View>

            {/* Item Rows or Empty Grid Placeholder */}
            {items.length === 0 ? (
              <View style={[styles.tableGridRow, { borderBottomWidth: 1, borderColor: theme.gridBorderColor, minHeight: 38 }]}>
                <View style={[styles.gridCell, styles.colDesc, { borderRightWidth: 1, borderColor: theme.gridBorderColor }]} />
                <View style={[styles.gridCell, styles.colQty, { borderRightWidth: 1, borderColor: theme.gridBorderColor }]} />
                <View style={[styles.gridCell, styles.colPrice, { borderRightWidth: 1, borderColor: theme.gridBorderColor }]} />
                <View style={[styles.gridCell, styles.colAmount]} />
              </View>
            ) : (
              items.map((it: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.tableGridRow,
                    { borderBottomWidth: 1, borderColor: theme.gridBorderColor },
                    i % 2 === 1 && { backgroundColor: theme.lightAccent },
                  ]}
                >
                  <View style={[styles.gridCell, styles.colDesc, { borderRightWidth: 1, borderColor: theme.gridBorderColor }]}>
                    <Text style={styles.tableCellBold} numberOfLines={2}>
                      {it.description}
                    </Text>
                  </View>
                  <View style={[styles.gridCell, styles.colQty, { borderRightWidth: 1, borderColor: theme.gridBorderColor, alignItems: "center" }]}>
                    <Text style={styles.tableCellText}>{it.qty}</Text>
                  </View>
                  <View style={[styles.gridCell, styles.colPrice, { borderRightWidth: 1, borderColor: theme.gridBorderColor, alignItems: "flex-end" }]}>
                    <Text style={styles.tableCellText}>
                      {formatCurrency(it.unitPrice, business?.currency, business?.currencySymbol)}
                    </Text>
                  </View>
                  <View style={[styles.gridCell, styles.colAmount, { alignItems: "flex-end" }]}>
                    <Text style={styles.tableCellBold}>
                      {formatCurrency(
                        it.qty * it.unitPrice,
                        business?.currency,
                        business?.currencySymbol
                      )}
                    </Text>
                  </View>
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
                  {formatCurrency(quote.subtotal || 0, business?.currency, business?.currencySymbol)}
                </Text>
              </View>

              {quote.discount > 0 && (
                <View style={styles.docSummaryRow}>
                  <Text style={styles.docSummaryLabel}>Discount</Text>
                  <Text style={styles.docSummaryVal}>
                    -{formatCurrency(quote.discount || 0, business?.currency, business?.currencySymbol)}
                  </Text>
                </View>
              )}

              {quote.tax > 0 && (
                <View style={styles.docSummaryRow}>
                  <Text style={styles.docSummaryLabel}>Tax ({quote.taxRate || 0}%)</Text>
                  <Text style={styles.docSummaryVal}>
                    {formatCurrency(quote.tax || 0, business?.currency, business?.currencySymbol)}
                  </Text>
                </View>
              )}

              {/* Solid Accent ESTIMATE TOTAL Banner */}
              <View style={[styles.balanceDueBanner, { backgroundColor: theme.accent }]}>
                <Text style={styles.balanceDueText}>ESTIMATE TOTAL</Text>
                <Text style={styles.balanceDueAmount}>
                  {formatCurrency(quote.total || 0, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
            </View>
          </View>

          {/* ACCEPTED Stamp Overlay (if accepted) */}
          {isAccepted && (
            <View style={styles.paidWatermarkStamp}>
              <Text style={styles.paidWatermarkText}>ACCEPTED</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Summary Card (1:1 with media_1790971011559.jpg) */}
      <View style={styles.bottomCardContainer}>
        {/* Row 1: Valid until on left, Status pill on right */}
        <View style={styles.bottomRow1}>
          <Text style={styles.bottomDueDate}>
            Valid until {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("en-GB") : "30 days"}
          </Text>
          <View style={[styles.pillBadge, isAccepted ? styles.pillPaid : styles.pillUnpaid]}>
            <Text style={[styles.pillText, isAccepted ? styles.pillTextPaid : styles.pillTextUnpaid]}>
              {isAccepted ? "Accepted" : quote.status?.toLowerCase() || "Draft"}
            </Text>
          </View>
        </View>

        {/* Row 2: Large total amount on left */}
        <View style={styles.bottomRow2}>
          <Text style={styles.bottomTotalAmount}>
            {formatCurrency(quote.total || 0, business?.currency, business?.currencySymbol)}
          </Text>
        </View>

        {/* Row 3: Client Name on left, Not sent pill on right */}
        <View style={styles.bottomRow3}>
          <Text style={styles.bottomClientName}>
            {quote.customer?.name || "Unknown Client"}
          </Text>
          <View style={[styles.pillBadge, styles.pillDelivery]}>
            <Text style={styles.pillTextDelivery}>Not sent</Text>
          </View>
        </View>

        {/* Primary Send Button with Paper Plane */}
        <TouchableOpacity
          style={[styles.primarySendBtn, { backgroundColor: theme.accent }]}
          onPress={() => setSendModalVisible(true)}
          activeOpacity={0.88}
        >
          <Feather name="send" size={17} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.primarySendBtnText}>Send Estimate</Text>
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
            onPress={() => router.push(`/quote-edit?id=${params.id}`)}
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
              <Text style={styles.sheetTitle}>{quote.number}</Text>
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
                router.push(`/customize?id=${quote.id}&type=quote`);
              }}
            >
              <MaterialIcons name="palette" size={22} color="#ec4899" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Customize</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMoreModalVisible(false);
                shareQuote();
              }}
            >
              <Feather name="share-2" size={20} color="#3b82f6" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setMoreModalVisible(false);
                router.push("/quote-create");
              }}
            >
              <Feather name="plus-circle" size={20} color="#10b981" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Create Estimate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={duplicateQuote}>
              <Feather name="copy" size={20} color="#6366f1" style={styles.sheetIcon} />
              <Text style={styles.sheetRowText}>Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={convertToInvoice}>
              <Feather name="check-circle" size={20} color="#059669" style={styles.sheetIcon} />
              <Text style={[styles.sheetRowText, { color: "#059669", fontWeight: "700" }]}>
                Convert to Invoice
              </Text>
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

      {/* "Send Estimate" Modal */}
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
            <Text style={styles.sendModalTitle}>Send Estimate</Text>
            <Text style={styles.sendModalSub}>Choose how to dispatch this estimate to the client</Text>

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
                <Text style={styles.sendOptionDesc}>Direct 1-tap message with estimate link</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendOptionBtn}
              onPress={() => {
                setSendModalVisible(false);
                shareQuote();
              }}
            >
              <Feather name="share-2" size={20} color="#059669" style={{ marginRight: 12 }} />
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
    top: 20,
    right: 20,
    zIndex: 20,
    backgroundColor: "#ffffff",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  documentSheet: {
    width: "100%",
    maxWidth: 400,
    minHeight: 500,
    backgroundColor: "#ffffff",
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  documentSheetZoomed: {
    maxWidth: "100%",
    transform: [{ scale: 1.08 }],
  },
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sheetBizWrap: {
    flex: 1,
  },
  sheetLogo: {
    width: 36,
    height: 36,
    marginBottom: 4,
  },
  sheetBizName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  sheetMetaSub: {
    fontSize: 10,
    color: "#64748b",
  },
  docLargeTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sheetDivider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  docInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  docBillToCol: {
    flex: 1,
    paddingRight: 10,
  },
  docSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  docClientName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  docMetaText: {
    fontSize: 11,
    color: "#64748b",
  },
  docMetaGrid: {
    flexDirection: "row",
    width: 140,
  },
  docMetaKeys: {
    flex: 1,
  },
  docMetaValues: {
    alignItems: "flex-end",
  },
  docMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  docMetaVal: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 4,
  },
  tableGrid: {
    borderWidth: 1,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  colDesc: {
    flex: 2,
  },
  colQty: {
    width: 44,
    textAlign: "center",
  },
  colPrice: {
    width: 65,
    textAlign: "right",
  },
  colAmount: {
    width: 75,
    textAlign: "right",
  },
  tableGridRow: {
    flexDirection: "row",
    minHeight: 34,
  },
  gridCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 11,
    color: "#1e293b",
  },
  tableCellBold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  docSummaryWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  docSummaryCol: {
    width: 175,
  },
  docSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  docSummaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  docSummaryVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  balanceDueBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  balanceDueText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  balanceDueAmount: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ffffff",
  },
  paidWatermarkStamp: {
    position: "absolute",
    top: "40%",
    left: "22%",
    borderWidth: 4,
    borderColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ rotate: "-22deg" }],
    opacity: 0.85,
  },
  paidWatermarkText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#059669",
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
    paddingTop: 14,
    paddingBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomRow1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  bottomDueDate: {
    fontSize: 12,
    color: "#64748b",
  },
  bottomRow2: {
    marginBottom: 2,
  },
  bottomTotalAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  bottomRow3: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bottomClientName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
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
    color: "#3730a3",
  },
  pillTextDelivery: {
    fontSize: 11,
    color: "#64748b",
  },
  primarySendBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 12,
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

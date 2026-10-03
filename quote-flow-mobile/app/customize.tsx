/**
 * Mobile Invoice & Quote Template Customizer — 1:1 match with customize.jpeg.
 * Features:
 * - Live real-time Document Sheet preview in upper viewport
 * - Category filter tabs (Recommend, Simple, Classic, Professional, Color)
 * - Horizontal carousel of template preview cards with PRO badges
 * - Bottom 6-tool navigation bar (Templates, Color, Font Size, Options, Logo, Signature)
 * - Direct Save button that commits styling back to the invoice/quote
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
  Image,
  Switch,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "@/store/app";
import { api, apiPatch, API_BASE_URL } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { SignaturePadModal } from "@/components/SignaturePadModal";

// Available templates matching web PDF catalog
const TEMPLATES = [
  { id: "modern", name: "Modern", category: "Recommend", accent: "#2563eb", pro: false },
  { id: "soft-emerald-wave", name: "Emerald Wave", category: "Recommend", accent: "#059669", pro: true },
  { id: "geometric-bold-green", name: "Bold Green", category: "Recommend", accent: "#10b981", pro: true },
  { id: "slate-geometric", name: "Slate Geo", category: "Recommend", accent: "#0f766e", pro: true },
  { id: "simple", name: "Simple Clean", category: "Simple", accent: "#374151", pro: false },
  { id: "minimal-clean", name: "Minimal", category: "Simple", accent: "#171717", pro: false },
  { id: "classic", name: "Classic Corporate", category: "Classic", accent: "#1e3a8a", pro: false },
  { id: "classic-corporate-blue", name: "Deep Blue", category: "Classic", accent: "#1d4ed8", pro: true },
  { id: "professional", name: "Professional", category: "Professional", accent: "#1e40af", pro: true },
  { id: "corporate", name: "Corporate", category: "Professional", accent: "#0284c7", pro: true },
  { id: "editorial", name: "Editorial", category: "Color", accent: "#b45309", pro: true },
  { id: "creative", name: "Creative Mesh", category: "Color", accent: "#9333ea", pro: true },
  { id: "mesh-polygonal", name: "Polygonal", category: "Color", accent: "#c026d3", pro: true },
];

const CATEGORIES = ["Recommend", "Simple", "Classic", "Professional", "Color"];

const ACCENT_COLORS = [
  "#2563eb", // Blue
  "#059669", // Emerald
  "#0d9488", // Teal
  "#7c3aed", // Purple
  "#dc2626", // Red
  "#d97706", // Amber
  "#334155", // Slate
  "#171717", // Obsidian
];

export default function CustomizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; type?: string }>();
  const isQuote = params.type === "quote";
  const business = useAppStore((s) => s.business);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<any | null>(null);

  // Customization state
  const [activeTab, setActiveTab] = useState<"Templates" | "Color" | "Font Size" | "Options" | "Logo" | "Signature">("Templates");
  const [activeCategory, setActiveCategory] = useState("Recommend");
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [selectedAccent, setSelectedAccent] = useState("#2563eb");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  // Options toggles
  const [showLogo, setShowLogo] = useState(true);
  const [showDueDate, setShowDueDate] = useState(true);
  const [showPaidStamp, setShowPaidStamp] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(business?.showBankOnInvoice ?? true);
  const [showUpiQr, setShowUpiQr] = useState(business?.showUpiOnInvoice ?? true);
  const [logoUrl, setLogoUrl] = useState(business?.logoUrl || "");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signaturePadVisible, setSignaturePadVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isQuote ? `/api/quotes/${params.id}` : `/api/invoices/${params.id}`;
      const r = await api<any>(endpoint);
      const data = isQuote ? r.quote : r.invoice;
      setDoc(data);
      if (data?.pdfTemplate) {
        const cleanTpl = data.pdfTemplate.includes(":")
          ? data.pdfTemplate.split(":").pop()!
          : data.pdfTemplate;
        setSelectedTemplate(cleanTpl);
        const match = TEMPLATES.find((t) => t.id === cleanTpl);
        if (match) setSelectedAccent(match.accent);
      }
      if (data?.notes) {
        try {
          if (data.notes.startsWith("{") && data.notes.endsWith("}")) {
            const meta = JSON.parse(data.notes);
            if (meta.signature) setSignatureData(meta.signature);
            else if (meta.signatureDataUrl) setSignatureData(meta.signatureDataUrl);
          }
        } catch {}
      }
    } catch {
      Alert.alert("Error", "Could not load document");
    } finally {
      setLoading(false);
    }
  }, [params.id, isQuote]);

  useEffect(() => {
    load();
  }, [load]);

  // Pick logo from photo library
  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera roll access is required to upload logo");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setLogoUrl(dataUri);
    }
  }

  // Pick signature from camera or library
  async function pickSignature(fromCamera = false) {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera or photo library permission is required");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.8, base64: true });

    if (!result.canceled && result.assets?.[0]?.base64) {
      setSignatureData(`data:image/jpeg;base64,${result.assets[0].base64}`);
      Alert.alert("Success", "Signature attached");
    }
  }

  // Save customizations
  async function handleSave() {
    setSaving(true);
    try {
      const endpoint = isQuote ? `/api/quotes/${params.id}` : `/api/invoices/${params.id}`;
      
      let prefix = "";
      if (doc?.pdfTemplate && doc.pdfTemplate.includes(":")) {
        prefix = doc.pdfTemplate.split(":")[0] + ":";
      }
      const fullTemplate = `${prefix}${selectedTemplate}`;

      let updatedNotes = doc?.notes;
      try {
        let meta: any = {};
        if (doc?.notes && doc.notes.startsWith("{") && doc.notes.endsWith("}")) {
          meta = JSON.parse(doc.notes);
        } else if (doc?.notes) {
          meta = { notes: doc.notes };
        }
        meta.signature = signatureData;
        meta.signatureDataUrl = signatureData;
        updatedNotes = JSON.stringify(meta);
      } catch {}

      await apiPatch(endpoint, {
        pdfTemplate: fullTemplate,
        notes: updatedNotes,
      });

      // Update business profile if options changed
      await apiPatch("/api/business/onboarding", {
        showBankOnInvoice: showBankDetails,
        showUpiOnInvoice: showUpiQr,
        logoUrl: logoUrl || null,
      }).catch(() => {});

      if (business) {
        useAppStore.getState().setBusiness({
          ...business,
          logoUrl: logoUrl || "",
          showBankOnInvoice: showBankDetails,
          showUpiOnInvoice: showUpiQr,
        });
      }

      handleBack();
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Could not save template customization");
    } finally {
      setSaving(false);
    }
  }

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (params.id) {
      const target = isQuote ? `/quote/${params.id}` : `/invoice/${params.id}`;
      router.replace(target as any);
    } else {
      router.replace(isQuote ? "/(tabs)/quotes" : "/(tabs)/invoices");
    }
  }, [router, params.id, isQuote]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const items = doc?.items || [];
  const filteredTemplates = TEMPLATES.filter(
    (t) => activeCategory === "Recommend" || t.category === activeCategory
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header matching customize.jpeg */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBackBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customize</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Live Preview Viewport (Upper screen) */}
      <View style={styles.previewViewport}>
        <View style={styles.sheetShadowWrap}>
          <View style={styles.liveSheet}>
            {/* Sheet Header */}
            <View style={styles.sheetTopRow}>
              <View style={{ flex: 1 }}>
                {showLogo && logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.sheetLogo} resizeMode="contain" />
                ) : null}
                <Text style={styles.sheetBizName}>{business?.name || "Your Business"}</Text>
                <Text style={styles.sheetMetaText}>{business?.email || "business@email.com"}</Text>
              </View>
              <Text style={[styles.sheetDocType, { color: selectedAccent }]}>
                {isQuote ? "ESTIMATE" : "INVOICE"}
              </Text>
            </View>

            {/* Bill To & Meta */}
            <View style={styles.sheetInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetLabel}>BILL TO</Text>
                <Text style={styles.sheetCustomerName}>{doc?.customer?.name || "Acme Client"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.sheetMetaLabel}>{isQuote ? "QUOTE #" : "INVOICE #"}</Text>
                <Text style={styles.sheetMetaVal}>{doc?.number || "INV0001"}</Text>
                {showDueDate && (
                  <>
                    <Text style={styles.sheetMetaLabel}>DUE DATE</Text>
                    <Text style={styles.sheetMetaVal}>On receipt</Text>
                  </>
                )}
              </View>
            </View>

            {/* Table */}
            <View style={styles.sheetTable}>
              <View style={[styles.sheetTableHeader, { backgroundColor: selectedAccent }]}>
                <Text style={[styles.sheetColHeader, { flex: 2 }]}>Description</Text>
                <Text style={[styles.sheetColHeader, { width: 35, textAlign: "center" }]}>QTY</Text>
                <Text style={[styles.sheetColHeader, { width: 55, textAlign: "right" }]}>Price</Text>
                <Text style={[styles.sheetColHeader, { width: 65, textAlign: "right" }]}>Amount</Text>
              </View>

              {(items.length > 0 ? items.slice(0, 2) : [{ description: "Service Work", qty: 1, unitPrice: 100 }]).map(
                (it: any, i: number) => (
                  <View key={i} style={styles.sheetTableRow}>
                    <Text style={[styles.sheetTableCell, { flex: 2 }]} numberOfLines={1}>
                      {it.description}
                    </Text>
                    <Text style={[styles.sheetTableCell, { width: 35, textAlign: "center" }]}>
                      {it.qty}
                    </Text>
                    <Text style={[styles.sheetTableCell, { width: 55, textAlign: "right" }]}>
                      {formatCurrency(it.unitPrice, business?.currency, business?.currencySymbol)}
                    </Text>
                    <Text style={[styles.sheetTableCell, { width: 65, textAlign: "right", fontWeight: "600" }]}>
                      {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* Balance Due Banner */}
            <View style={styles.sheetTotalsWrap}>
              <View style={[styles.sheetBalanceBanner, { backgroundColor: selectedAccent }]}>
                <Text style={styles.sheetBalanceText}>BALANCE DUE</Text>
                <Text style={styles.sheetBalanceAmount}>
                  {formatCurrency(doc?.total || 0, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
            </View>

            {/* Signature Preview */}
            {signatureData ? (
              <View style={{ alignItems: "flex-end", marginTop: 6, paddingRight: 6 }}>
                <Image source={{ uri: signatureData }} style={{ width: 80, height: 26 }} resizeMode="contain" />
                <View style={{ width: 80, borderTopWidth: 1, borderTopColor: "#cbd5e1", marginTop: 2, alignItems: "center" }}>
                  <Text style={{ fontSize: 7, color: "#64748b", textTransform: "uppercase" }}>Signature</Text>
                </View>
              </View>
            ) : null}

            {/* Watermark stamp if enabled */}
            {showPaidStamp && (
              <View style={styles.stampBadge}>
                <Text style={styles.stampText}>PAID</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Control Drawer matching customize.jpeg */}
      <View style={styles.controlPanel}>
        {/* If "Templates" tool is active */}
        {activeTab === "Templates" && (
          <View>
            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      activeCategory === cat && styles.categoryTabTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Horizontal Template Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
            >
              {filteredTemplates.map((t) => {
                const isSelected = selectedTemplate === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.templateCard, isSelected && styles.templateCardSelected]}
                    onPress={() => {
                      setSelectedTemplate(t.id);
                      setSelectedAccent(t.accent);
                    }}
                    activeOpacity={0.8}
                  >
                    {t.pro && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                    {/* Visual Card Representation */}
                    <View style={styles.cardMiniSheet}>
                      <View style={[styles.cardMiniHeader, { backgroundColor: t.accent }]} />
                      <View style={styles.cardMiniLines}>
                        <View style={[styles.cardMiniLine, { width: "70%" }]} />
                        <View style={[styles.cardMiniLine, { width: "40%" }]} />
                        <View style={[styles.cardMiniLine, { width: "85%", marginTop: 8 }]} />
                      </View>
                    </View>
                    <Text style={styles.templateCardName} numberOfLines={1}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* If "Color" tool is active */}
        {activeTab === "Color" && (
          <View style={styles.colorPanel}>
            <Text style={styles.panelSectionTitle}>Select Accent Color</Text>
            <View style={styles.colorSwatchesRow}>
              {ACCENT_COLORS.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: hex },
                    selectedAccent === hex && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setSelectedAccent(hex)}
                >
                  {selectedAccent === hex && <Feather name="check" size={16} color="#ffffff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* If "Font Size" tool is active */}
        {activeTab === "Font Size" && (
          <View style={styles.colorPanel}>
            <Text style={styles.panelSectionTitle}>Typography Scale</Text>
            <View style={styles.fontSizeRow}>
              {(["small", "medium", "large"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.fontSizePill, fontSize === s && styles.fontSizePillActive]}
                  onPress={() => setFontSize(s)}
                >
                  <Text
                    style={[
                      styles.fontSizePillText,
                      fontSize === s && styles.fontSizePillTextActive,
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* If "Options" tool is active */}
        {activeTab === "Options" && (
          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            <View style={styles.optionToggleRow}>
              <Text style={styles.optionLabel}>Show Business Logo</Text>
              <Switch value={showLogo} onValueChange={setShowLogo} thumbColor="#2563eb" />
            </View>
            <View style={styles.optionToggleRow}>
              <Text style={styles.optionLabel}>Show Due Date</Text>
              <Switch value={showDueDate} onValueChange={setShowDueDate} thumbColor="#2563eb" />
            </View>
            <View style={styles.optionToggleRow}>
              <Text style={styles.optionLabel}>Show 'PAID' Stamp on Invoice</Text>
              <Switch value={showPaidStamp} onValueChange={setShowPaidStamp} thumbColor="#2563eb" />
            </View>
            <View style={styles.optionToggleRow}>
              <Text style={styles.optionLabel}>Show Bank Transfer Details</Text>
              <Switch
                value={showBankDetails}
                onValueChange={setShowBankDetails}
                thumbColor="#2563eb"
              />
            </View>
            <View style={styles.optionToggleRow}>
              <Text style={styles.optionLabel}>Show Dynamic UPI QR Code</Text>
              <Switch value={showUpiQr} onValueChange={setShowUpiQr} thumbColor="#2563eb" />
            </View>
          </ScrollView>
        )}

        {/* If "Logo" tool is active */}
        {activeTab === "Logo" && (
          <View style={styles.logoPanel}>
            {logoUrl ? (
              <View style={styles.logoPreviewWrap}>
                <Image source={{ uri: logoUrl }} style={styles.uploadedLogo} resizeMode="contain" />
                <TouchableOpacity style={styles.btnOutlineSmall} onPress={pickLogo}>
                  <Text style={styles.btnOutlineSmallText}>Change Logo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnOutlineSmall, { borderColor: "#ef4444", marginLeft: 8 }]}
                  onPress={() => setLogoUrl("")}
                >
                  <Text style={[styles.btnOutlineSmallText, { color: "#ef4444" }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadLogoBox} onPress={pickLogo}>
                <Feather name="upload-cloud" size={28} color="#2563eb" />
                <Text style={styles.uploadLogoText}>Upload Business Logo</Text>
                <Text style={styles.uploadLogoSub}>PNG, JPG or SVG</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* If "Signature" tool is active */}
        {activeTab === "Signature" && (
          <View style={styles.sigPanel}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.panelSectionTitle}>Authorized Signature</Text>
              {signatureData ? (
                <TouchableOpacity onPress={() => setSignatureData(null)}>
                  <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600" }}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {signatureData ? (
              <View style={[styles.sigBox, { alignItems: "center", paddingVertical: 10 }]}>
                <Image source={{ uri: signatureData }} style={{ width: 140, height: 50, marginBottom: 8 }} resizeMode="contain" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={[styles.sigBtn, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]} onPress={() => setSignaturePadVisible(true)}>
                    <MaterialIcons name="draw" size={15} color="#2563eb" style={{ marginRight: 4 }} />
                    <Text style={[styles.sigBtnText, { color: "#2563eb" }]}>Draw</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sigBtn} onPress={() => pickSignature(false)}>
                    <Feather name="image" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                    <Text style={styles.sigBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sigBtn} onPress={() => pickSignature(true)}>
                    <Feather name="camera" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                    <Text style={styles.sigBtnText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.sigBox}>
                <Text style={styles.sigBoxText}>No authorized signature attached yet</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity style={[styles.sigBtn, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]} onPress={() => setSignaturePadVisible(true)}>
                    <MaterialIcons name="draw" size={15} color="#2563eb" style={{ marginRight: 4 }} />
                    <Text style={[styles.sigBtnText, { color: "#2563eb" }]}>Draw Signature</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sigBtn} onPress={() => pickSignature(false)}>
                    <Feather name="image" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                    <Text style={styles.sigBtnText}>Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Bottom 6-Tool Navigation Bar (matches customize.jpeg) */}
        <View style={styles.bottomToolBar}>
          <TouchableOpacity
            style={styles.toolItem}
            onPress={() => setActiveTab("Templates")}
          >
            <MaterialIcons
              name="dashboard"
              size={22}
              color={activeTab === "Templates" ? "#2563eb" : "#64748b"}
            />
            <Text
              style={[styles.toolLabel, activeTab === "Templates" && styles.toolLabelActive]}
            >
              Templates
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => setActiveTab("Color")}>
            <MaterialIcons
              name="palette"
              size={22}
              color={activeTab === "Color" ? "#2563eb" : "#64748b"}
            />
            <Text style={[styles.toolLabel, activeTab === "Color" && styles.toolLabelActive]}>
              Color
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => setActiveTab("Font Size")}>
            <MaterialIcons
              name="text-fields"
              size={22}
              color={activeTab === "Font Size" ? "#2563eb" : "#64748b"}
            />
            <Text style={[styles.toolLabel, activeTab === "Font Size" && styles.toolLabelActive]}>
              Font Size
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => setActiveTab("Options")}>
            <MaterialIcons
              name="tune"
              size={22}
              color={activeTab === "Options" ? "#2563eb" : "#64748b"}
            />
            <Text style={[styles.toolLabel, activeTab === "Options" && styles.toolLabelActive]}>
              Options
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => setActiveTab("Logo")}>
            <MaterialIcons
              name="add-business"
              size={22}
              color={activeTab === "Logo" ? "#2563eb" : "#64748b"}
            />
            <Text style={[styles.toolLabel, activeTab === "Logo" && styles.toolLabelActive]}>
              Logo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem} onPress={() => setActiveTab("Signature")}>
            <MaterialIcons
              name="draw"
              size={22}
              color={activeTab === "Signature" ? "#2563eb" : "#64748b"}
            />
            <Text style={[styles.toolLabel, activeTab === "Signature" && styles.toolLabelActive]}>
              Signature
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        visible={signaturePadVisible}
        onClose={() => setSignaturePadVisible(false)}
        onSave={(dataUrl) => {
          setSignatureData(dataUrl);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBackBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  previewViewport: {
    flex: 1,
    backgroundColor: "#eef2f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  sheetShadowWrap: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  liveSheet: {
    padding: 14,
    minHeight: 280,
  },
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
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
  sheetMetaText: {
    fontSize: 10,
    color: "#64748b",
  },
  sheetDocType: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sheetInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
  },
  sheetCustomerName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  sheetMetaLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: "#64748b",
  },
  sheetMetaVal: {
    fontSize: 9,
    fontWeight: "600",
    color: "#0f172a",
  },
  sheetTable: {
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  sheetTableHeader: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  sheetColHeader: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff",
  },
  sheetTableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetTableCell: {
    fontSize: 9,
    color: "#1e293b",
  },
  sheetTotalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  sheetBalanceBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 160,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  sheetBalanceText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
  sheetBalanceAmount: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  stampBadge: {
    position: "absolute",
    top: "35%",
    left: "25%",
    borderWidth: 2,
    borderColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
    transform: [{ rotate: "-20deg" }],
    opacity: 0.8,
  },
  stampText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ef4444",
    letterSpacing: 2,
  },
  controlPanel: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  categoryTab: {
    paddingBottom: 4,
  },
  categoryTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  categoryTabTextActive: {
    color: "#2563eb",
  },
  carouselScroll: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  templateCard: {
    width: 80,
    height: 105,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    padding: 4,
    position: "relative",
  },
  templateCardSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  proBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    zIndex: 2,
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#ffffff",
  },
  cardMiniSheet: {
    width: "100%",
    height: 72,
    backgroundColor: "#ffffff",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 4,
  },
  cardMiniHeader: {
    height: 12,
    width: "100%",
  },
  cardMiniLines: {
    padding: 4,
  },
  cardMiniLine: {
    height: 3,
    backgroundColor: "#e2e8f0",
    borderRadius: 1,
    marginBottom: 3,
  },
  templateCardName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1e293b",
  },
  colorPanel: {
    padding: 16,
  },
  panelSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  colorSwatchesRow: {
    flexDirection: "row",
    gap: 12,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  fontSizeRow: {
    flexDirection: "row",
    gap: 10,
  },
  fontSizePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  fontSizePillActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  fontSizePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  fontSizePillTextActive: {
    color: "#2563eb",
  },
  optionsList: {
    maxHeight: 140,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  optionToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  optionLabel: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "500",
  },
  logoPanel: {
    padding: 16,
    alignItems: "center",
  },
  logoPreviewWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadedLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  btnOutlineSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  btnOutlineSmallText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  uploadLogoBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#93c5fd",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "#eff6ff",
    width: "100%",
  },
  uploadLogoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
    marginTop: 4,
  },
  uploadLogoSub: {
    fontSize: 11,
    color: "#64748b",
  },
  sigPanel: {
    padding: 16,
  },
  sigBox: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sigBoxText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
  },
  sigBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  sigBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  bottomToolBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  toolItem: {
    alignItems: "center",
    width: 60,
  },
  toolLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  toolLabelActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
});

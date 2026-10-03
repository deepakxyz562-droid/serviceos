import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppStore } from "@/store/app";
import { apiPatch, clearToken, API_BASE_URL } from "@/api/client";
import {
  sanitizePhone,
  isValidPhone,
  sanitizeEmail,
  isValidEmail,
  sanitizeDecimal,
  sanitizeInteger,
  sanitizeIfsc,
  isValidIfsc,
  sanitizeUpi,
  isValidUpi,
} from "@/lib/validation";

export default function SettingsScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const reset = useAppStore((s) => s.reset);

  const [name, setName] = useState(business?.name ?? "");
  const [ownerName, setOwnerName] = useState(business?.ownerName ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [email, setEmail] = useState(business?.email ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(business?.defaultTaxRate ?? 0));
  const [saving, setSaving] = useState(false);

  // Bank + UPI fields (Phase M3)
  const [upiId, setUpiId] = useState(business?.upiId ?? "");
  const [bankAccountName, setBankAccountName] = useState(business?.bankAccountName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(business?.bankAccountNumber ?? "");
  const [bankIfsc, setBankIfsc] = useState(business?.bankIfsc ?? "");
  const [bankName, setBankName] = useState(business?.bankName ?? "");
  const [showBankFields, setShowBankFields] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function save() {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter your business name.");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number (7 to 15 digits).");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    const taxNum = parseFloat(defaultTaxRate);
    if (defaultTaxRate.trim() && (isNaN(taxNum) || taxNum < 0 || taxNum > 100)) {
      Alert.alert("Invalid Tax Rate", "Default tax percentage must be between 0 and 100.");
      return;
    }
    if (upiId.trim() && !isValidUpi(upiId)) {
      Alert.alert("Invalid UPI ID", "Please enter a valid UPI ID (e.g. yourname@bank).");
      return;
    }
    if (bankIfsc.trim() && !isValidIfsc(bankIfsc)) {
      Alert.alert("Invalid IFSC Code", "IFSC code must be 11 characters (e.g. HDFC0001234).");
      return;
    }
    setSaving(true);
    try {
      const r = await apiPatch<{ business: any }>("/api/mobile/business", {
        name,
        ownerName,
        phone,
        email: email || undefined,
        address,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
        // Bank + UPI fields (Phase M3)
        upiId: upiId || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        bankIfsc: bankIfsc || undefined,
        bankName: bankName || undefined,
      });
      setBusiness(r.business);
      Alert.alert("Saved");
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant photo library access to upload a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingLogo(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.type || "image/png",
        name: asset.fileName || "logo.png",
      } as any);

      const token = await import("expo-secure-store").then((m) => m.getItemAsync("quoteflow_token"));
      const res = await fetch(`${API_BASE_URL}/api/quote-flow/business/logo`, {
        method: "POST",
        headers: {
          "x-quoteflow-token": token || "",
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Upload failed", data.error || "Could not upload logo");
        return;
      }
      // Update business in store
      if (business) {
        setBusiness({ ...business, logoUrl: data.logoUrl });
      }
      Alert.alert("Logo uploaded");
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function signOut() {
    await clearToken();
    reset();
    router.replace("/auth");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Business info &amp; account</Text>

          <View style={styles.planCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={styles.planTitle}>18-Month Free Access Active</Text>
              <View style={{ backgroundColor: "#10b981", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>18M FREE</Text>
              </View>
            </View>
            <Text style={styles.planSub}>
              All PRO features, 100+ templates, and unlimited quotes &amp; invoices are 100% free.
            </Text>
          </View>

          <View style={styles.card}>
            <Input label="Business name" value={name} onChangeText={setName} placeholder="e.g. Acme Services" />
            <Input label="Your name" value={ownerName} onChangeText={setOwnerName} placeholder="e.g. John Doe" />
            <View style={styles.row}>
              <View style={styles.col}>
                <Input
                  label="Phone"
                  value={phone}
                  onChangeText={(t) => setPhone(sanitizePhone(t))}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  placeholder="+91 98765 43210"
                />
              </View>
              <View style={styles.col}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  placeholder="contact@business.com"
                />
              </View>
            </View>
            <Input label="Address" value={address} onChangeText={setAddress} placeholder="Street, City, State, Pincode" />
            <Input
              label="Default tax %"
              value={defaultTaxRate}
              onChangeText={(t) => setDefaultTaxRate(sanitizeDecimal(t))}
              keyboardType="decimal-pad"
              placeholder="e.g. 18"
            />
            <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={save} disabled={saving}>
              <Text style={styles.buttonText}>{saving ? "Please wait..." : "Save"}</Text>
            </TouchableOpacity>
          </View>

          {/* Logo upload (Phase M3) */}
          <Text style={styles.sectionTitle}>Business Logo</Text>
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {business?.logoUrl ? (
                <Image source={{ uri: business.logoUrl }} style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4" }} />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#f5f5f4", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 20, color: "#a8a29e" }}>📷</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginTop: 0 }]}
                onPress={pickLogo}
                disabled={uploadingLogo}
              >
                <Text style={styles.buttonText}>{uploadingLogo ? "Uploading..." : "Upload Logo"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>PNG, JPEG, or SVG. Max 2MB. Shown on PDF invoices + quotes.</Text>
          </View>

          {/* Payment details (Phase M3) */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.card}>
            <Input
              label="UPI ID"
              value={upiId}
              onChangeText={(t) => setUpiId(sanitizeUpi(t))}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="yourname@okhdfcbank"
            />

            <TouchableOpacity
              style={styles.collapseBtn}
              onPress={() => setShowBankFields(!showBankFields)}
            >
              <Text style={styles.collapseText}>
                {showBankFields ? "▼ Hide bank details" : "▶ Show bank details"}
              </Text>
            </TouchableOpacity>

            {showBankFields && (
              <>
                <Input label="Account holder name" value={bankAccountName} onChangeText={setBankAccountName} placeholder="Account holder name" />
                <Input
                  label="Account number"
                  value={bankAccountNumber}
                  onChangeText={(t) => setBankAccountNumber(sanitizeInteger(t))}
                  keyboardType="number-pad"
                  placeholder="e.g. 5010023456789"
                />
                <Input
                  label="IFSC code"
                  value={bankIfsc}
                  onChangeText={(t) => setBankIfsc(sanitizeIfsc(t))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={11}
                  placeholder="e.g. HDFC0001234"
                />
                <Input label="Bank name" value={bankName} onChangeText={setBankName} placeholder="e.g. HDFC Bank" />
              </>
            )}
            <Text style={styles.hint}>These details appear on your invoice PDFs + customer portal.</Text>
            <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={save} disabled={saving}>
              <Text style={styles.buttonText}>{saving ? "Please wait..." : "Save Payment Details"}</Text>
            </TouchableOpacity>
          </View>

          {/* Reports + Export + Sync menu items */}
          <Text style={styles.sectionTitle}>More</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/reports")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="bar-chart" size={18} color="#9333ea" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1c1917", flex: 1 }}>Report & Analytics</Text>
              <MaterialIcons name="chevron-right" size={20} color="#a8a29e" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              const url = `${API_BASE_URL}/api/quote-flow/export/invoices`;
              Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open export link"));
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="download" size={18} color="#2563eb" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1c1917", flex: 1 }}>Export & Import</Text>
              <MaterialIcons name="chevron-right" size={20} color="#a8a29e" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => Alert.alert("Sync", "Data synced successfully!")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="sync" size={18} color="#059669" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1c1917", flex: 1 }}>Sync</Text>
              <MaterialIcons name="chevron-right" size={20} color="#a8a29e" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>QuoteFlow v1.0 · Describe it. We create it.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  autoCorrect = true,
  maxLength,
  textContentType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  maxLength?: number;
  textContentType?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        textContentType={textContentType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  flex: { flex: 1 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c1917" },
  subtitle: { fontSize: 14, color: "#78716c", marginBottom: 16 },
  planCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  planTitle: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  planSub: { fontSize: 12, color: "#57534e", marginTop: 2 },
  card: { backgroundColor: "white", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e7e5e4" },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  label: { fontSize: 13, color: "#57534e", marginBottom: 4, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "white",
  },
  button: { backgroundColor: "#10b981", paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 14 },
  signOutBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  signOutText: { color: "#dc2626", fontWeight: "500", fontSize: 14 },
  version: { textAlign: "center", fontSize: 11, color: "#a8a29e", marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1c1917", marginTop: 20, marginBottom: 8 },
  hint: { fontSize: 11, color: "#a8a29e", marginTop: 8 },
  collapseBtn: { paddingVertical: 10, marginTop: 4 },
  collapseText: { fontSize: 13, color: "#2563eb", fontWeight: "500" },
});

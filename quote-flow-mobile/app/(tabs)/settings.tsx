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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "@/store/app";
import { apiPatch, clearToken, API_BASE_URL } from "@/api/client";

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
      const updated = { ...business, logoUrl: data.logoUrl };
      setBusiness(updated);
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
            <Input label="Business name" value={name} onChangeText={setName} />
            <Input label="Your name" value={ownerName} onChangeText={setOwnerName} />
            <View style={styles.row}>
              <View style={styles.col}>
                <Input label="Phone" value={phone} onChangeText={setPhone} />
              </View>
              <View style={styles.col}>
                <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
              </View>
            </View>
            <Input label="Address" value={address} onChangeText={setAddress} />
            <Input label="Default tax %" value={defaultTaxRate} onChangeText={setDefaultTaxRate} keyboardType="numeric" />
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
            <Input label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="yourname@okhdfcbank" />

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
                <Input label="Account holder name" value={bankAccountName} onChangeText={setBankAccountName} />
                <Input label="Account number" value={bankAccountNumber} onChangeText={setBankAccountNumber} keyboardType="numeric" />
                <Input label="IFSC code" value={bankIfsc} onChangeText={setBankIfsc} placeholder="HDFC0001234" />
                <Input label="Bank name" value={bankName} onChangeText={setBankName} placeholder="HDFC Bank" />
              </>
            )}
            <Text style={styles.hint}>These details appear on your invoice PDFs + customer portal.</Text>
            <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={save} disabled={saving}>
              <Text style={styles.buttonText}>{saving ? "Please wait..." : "Save Payment Details"}</Text>
            </TouchableOpacity>
          </View>

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
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric";
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

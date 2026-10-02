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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { apiPatch, clearToken } from "@/api/client";

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
      });
      setBusiness(r.business);
      Alert.alert("Saved");
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
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
            <Text style={styles.planTitle}>{business?.plan === "PRO" ? "Pro plan" : "Free plan"}</Text>
            <Text style={styles.planSub}>
              {business?.plan === "PRO" ? "Unlimited quotes & invoices" : "3 quotes per month"}
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
});

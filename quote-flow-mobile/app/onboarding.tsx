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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/app";
import { apiPost } from "@/api/client";

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "INR", symbol: "₹" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "JPY", symbol: "¥" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setBusiness = useAppStore((s) => s.setBusiness);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currencyIdx, setCurrencyIdx] = useState(0);
  const [defaultTaxRate, setDefaultTaxRate] = useState("0");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Business name is required");
      return;
    }
    setLoading(true);
    try {
      const c = CURRENCIES[currencyIdx];
      const r = await apiPost<{ business: any }>("/api/mobile/business", {
        name,
        ownerName,
        phone,
        email: email || undefined,
        address,
        currency: c.code,
        currencySymbol: c.symbol,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
      });
      setBusiness(r.business);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Setup failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Let&apos;s set up your business</Text>
          <Text style={styles.subtitle}>
            This information appears on your quotes and invoices.
          </Text>

          <Input label="Business name *" value={name} onChangeText={setName} placeholder="ABC Plumbing" />
          <Input label="Your name" value={ownerName} onChangeText={setOwnerName} placeholder="Mike" />
          <View style={styles.row}>
            <View style={styles.col}>
              <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 555..." />
            </View>
            <View style={styles.col}>
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="hello@abc.com" keyboardType="email-address" />
            </View>
          </View>
          <Input label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St, City" />

          <Text style={styles.label}>Currency</Text>
          <View style={styles.pills}>
            {CURRENCIES.map((c, i) => (
              <TouchableOpacity
                key={c.code}
                onPress={() => setCurrencyIdx(i)}
                style={[styles.pill, currencyIdx === i && styles.pillActive]}
              >
                <Text style={[styles.pillText, currencyIdx === i && styles.pillTextActive]}>
                  {c.code} ({c.symbol})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Default tax %"
            value={defaultTaxRate}
            onChangeText={setDefaultTaxRate}
            placeholder="0"
            keyboardType="numeric"
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Please wait..." : "Continue"}</Text>
          </TouchableOpacity>
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
    <View style={styles.inputWrap}>
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
  scroll: { padding: 24, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c1917" },
  subtitle: { fontSize: 14, color: "#78716c", marginBottom: 24 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  inputWrap: { marginBottom: 14 },
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
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    backgroundColor: "white",
  },
  pillActive: { backgroundColor: "#1c1917", borderColor: "#1c1917" },
  pillText: { fontSize: 13, color: "#57534e" },
  pillTextActive: { color: "white" },
  button: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 15 },
});

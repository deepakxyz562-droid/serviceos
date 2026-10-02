import { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { api, apiPost, apiPatch } from "@/api/client";

export default function CustomerFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [preloaded, setPreloaded] = useState(!params.id);

  // Pre-load existing customer when editing
  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const r = await api<{ customer: any }>(`/api/mobile/customers/${params.id}`);
        const c = r.customer;
        setName(c.name || "");
        setEmail(c.email || "");
        setPhone(c.phone || "");
        setAddress(c.address || "");
        setNotes(c.notes || "");
      } catch (e: any) {
        Alert.alert("Load failed", e.message);
      } finally {
        setPreloaded(true);
      }
    })();
  }, [params.id]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Name is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
      };
      if (params.id) {
        await apiPatch(`/api/mobile/customers/${params.id}`, payload);
      } else {
        await apiPost("/api/mobile/customers", payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!preloaded) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{params.id ? "Edit customer" : "New customer"}</Text>
        <View style={{ width: 60 }} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Input label="Name *" value={name} onChangeText={setName} placeholder="John Smith" />
          <View style={styles.row}>
            <View style={styles.col}>
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="john@email.com" keyboardType="email-address" />
            </View>
            <View style={styles.col}>
              <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 555..." />
            </View>
          </View>
          <Input label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St, City" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Please wait..." : params.id ? "Save" : "Create"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={{ marginBottom: 14 }}>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  backText: { color: "#10b981", fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  label: { fontSize: 13, color: "#57534e", marginBottom: 4, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: "white" },
  button: { backgroundColor: "#10b981", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 15 },
});

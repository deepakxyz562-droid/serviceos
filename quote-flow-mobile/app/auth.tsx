import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/app";
import { apiPost, saveToken } from "@/api/client";

export default function AuthScreen() {
  const router = useRouter();
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password || password.length < 6) {
      Alert.alert("Please enter a valid email and password (min 6 chars).");
      return;
    }
    setLoading(true);
    try {
      const r = await apiPost<{ token: string; user: any }>("/api/mobile/auth", {
        email,
        password,
        name: name || undefined,
      });
      await saveToken(r.token);
      setToken(r.token);
      setUser(r.user);
      // Bootstrap will fetch business
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Auth failed", e.message);
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
        <View style={styles.container}>
          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>✦</Text>
          </View>
          <Text style={styles.title}>QuoteFlow</Text>
          <Text style={styles.subtitle}>Describe it. We create it.</Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === "login" && styles.tabActive]}
              onPress={() => setMode("login")}
            >
              <Text
                style={[styles.tabText, mode === "login" && styles.tabTextActive]}
              >
                Sign in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === "register" && styles.tabActive]}
              onPress={() => setMode("register")}
            >
              <Text
                style={[styles.tabText, mode === "register" && styles.tabTextActive]}
              >
                Create account
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "register" && (
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          )}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            By continuing you agree to our terms. New emails auto-create an account.
          </Text>
        </View>
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
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
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
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: "center" },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  logoEmoji: { color: "white", fontSize: 32, fontWeight: "bold" },
  title: { fontSize: 28, fontWeight: "bold", color: "#1c1917", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#78716c", textAlign: "center", marginBottom: 24 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 6 },
  tabActive: { backgroundColor: "white" },
  tabText: { textAlign: "center", color: "#78716c", fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: "#1c1917" },
  inputWrap: { marginBottom: 12 },
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
  button: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 15 },
  hint: { textAlign: "center", color: "#a8a29e", fontSize: 12, marginTop: 16 },
});

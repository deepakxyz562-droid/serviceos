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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAppStore } from "@/store/app";
import { apiPost, saveToken, API_BASE_URL } from "@/api/client";

// Complete auth sessions if opened in browser popup
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const setToken = useAppStore((s) => s.setToken);
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit() {
    if (!email || !password || password.length < 6) {
      Alert.alert("Input Error", "Please enter a valid email and password (min 6 chars).");
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
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Auth failed", e.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL("auth-callback");
      const authUrl = `${API_BASE_URL}/api/auth/google?mode=mobile&redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const token = (parsed.queryParams?.token as string) || "";
        const userEmail = (parsed.queryParams?.email as string) || "";
        const userName = (parsed.queryParams?.name as string) || "";
        const error = (parsed.queryParams?.error as string) || "";

        if (error) {
          Alert.alert("Google Sign-In", decodeURIComponent(error));
          return;
        }

        if (token) {
          await saveToken(token);
          setToken(token);
          setUser({ id: "user", email: userEmail, name: userName });
          router.replace("/");
          return;
        }
      }
    } catch (e: any) {
      Alert.alert("Google Sign-In", e.message || "Could not complete Google Sign-In.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Logo & App Branding */}
          <View style={styles.logo}>
            <MaterialIcons name="receipt-long" size={32} color="#ffffff" />
          </View>
          <Text style={styles.title}>Invoice Maker</Text>
          <Text style={styles.subtitle}>Fast Invoice, Bill, Quote & PDF Maker</Text>
          
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>GST BILLING & ESTIMATES</Text>
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, (googleLoading || loading) && styles.buttonDisabled]}
            onPress={handleGoogleAuth}
            disabled={googleLoading || loading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#4285F4" style={{ marginRight: 10 }} />
            ) : (
              <FontAwesome5 name="google" size={18} color="#EA4335" style={{ marginRight: 12 }} />
            )}
            <Text style={styles.googleButtonText}>
              {googleLoading ? "Signing in with Google..." : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Tabs: Sign in vs Create account */}
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
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your business or full name" />
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
            style={[styles.button, (loading || googleLoading) && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading || googleLoading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            By continuing you agree to our terms. New accounts receive 14 days full access.
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
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
    shadowColor: "#2563eb",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1e293b", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 2, marginBottom: 8 },
  badgeWrap: {
    alignSelf: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 0.6,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: "#0f172a", fontWeight: "700" },
  inputWrap: { marginBottom: 12 },
  label: { fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "white",
    color: "#0f172a",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563eb",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  hint: { textAlign: "center", color: "#94a3b8", fontSize: 11, marginTop: 16, lineHeight: 16 },
});

/**
 * Create Client / Edit Client screen — 1:1 match with Invoice Maker reference (create-client.jpeg & create-client2.jpeg).
 * Features:
 * - Top header with Back arrow, "Create Client" title, and Save pill button
 * - Import from contacts action pill
 * - Card 1: Basic Info (Name *, GSTIN, Phone, Email)
 * - Card 2: Billing Address (Line 1 & Line 2)
 * - Card 3: Shipping Address (Line 1 & Line 2)
 * - Card 4: Tax Registration Name, Tax Registration Number, License Number
 * - Card 5: Client Detail (Not Shown on Invoice) with character counter
 * - Collapsible "Show More Fields / Show Less Fields" toggle
 */
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api, apiPost, apiPatch } from "@/api/client";
import { MaterialIcons, Feather } from "@expo/vector-icons";

export default function CustomerFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  // Basic Info
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Addresses
  const [billingLine1, setBillingLine1] = useState("");
  const [billingLine2, setBillingLine2] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");

  // Tax & Registration Info
  const [taxRegName, setTaxRegName] = useState("");
  const [taxRegNumber, setTaxRegNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Client Detail (Not shown on invoice)
  const [notes, setNotes] = useState("");

  // UI state
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preloaded, setPreloaded] = useState(!params.id);

  // Pre-load existing customer when editing
  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const r = await api<{ customer: any }>(`/api/customers/${params.id}`);
        const c = r.customer;
        setName(c.name || "");
        setEmail(c.email || "");
        setPhone(c.phone || "");

        // Parse structured address or notes if available
        if (c.address) {
          const parts = c.address.split("\n");
          setBillingLine1(parts[0] || "");
          setBillingLine2(parts.slice(1).join(", ") || "");
        }
        if (c.notes) {
          try {
            if (c.notes.startsWith("{")) {
              const parsed = JSON.parse(c.notes);
              setGstin(parsed.gstin || "");
              setShippingLine1(parsed.shippingLine1 || "");
              setShippingLine2(parsed.shippingLine2 || "");
              setTaxRegName(parsed.taxRegName || "");
              setTaxRegNumber(parsed.taxRegNumber || "");
              setLicenseNumber(parsed.licenseNumber || "");
              setNotes(parsed.internalNotes || "");
            } else {
              setNotes(c.notes);
            }
          } catch {
            setNotes(c.notes);
          }
        }
      } catch (e: any) {
        Alert.alert("Load failed", e.message);
      } finally {
        setPreloaded(true);
      }
    })();
  }, [params.id]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter client name");
      return;
    }
    setLoading(true);
    try {
      const fullBillingAddress = [billingLine1, billingLine2].filter(Boolean).join("\n");
      const structuredNotes = JSON.stringify({
        gstin,
        shippingLine1,
        shippingLine2,
        taxRegName,
        taxRegNumber,
        licenseNumber,
        internalNotes: notes,
      });

      const payload = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: fullBillingAddress || undefined,
        notes: structuredNotes,
      };

      if (params.id) {
        await apiPatch(`/api/customers/${params.id}`, payload);
      } else {
        await apiPost("/api/customers", payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleImportContacts() {
    Alert.alert(
      "Import Contacts",
      "Connect device contacts to quickly populate client name, phone and email.",
      [{ text: "OK" }]
    );
  }

  if (!preloaded) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top Header matching create-client.jpeg */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{params.id ? "Edit Client" : "Create Client"}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Import from contacts button (create-client.jpeg) */}
          <View style={styles.importBtnWrap}>
            <TouchableOpacity
              style={styles.importContactsBtn}
              onPress={handleImportContacts}
              activeOpacity={0.8}
            >
              <Feather name="user-check" size={17} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.importContactsText}>Import from contacts</Text>
            </TouchableOpacity>
          </View>

          {/* Card 1: Basic Info (create-client.jpeg) */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>
              Name <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.inputField}
              placeholder="Enter Client Name Here"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>GSTIN</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Enter GSTIN Number Here"
              placeholderTextColor="#94a3b8"
              value={gstin}
              onChangeText={setGstin}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Optional"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.inputField, { marginBottom: 0 }]}
              placeholder="Optional"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Card 2: Billing Address (create-client.jpeg) */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Billing Address</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Address Line 1 (Optional)"
              placeholderTextColor="#94a3b8"
              value={billingLine1}
              onChangeText={setBillingLine1}
            />
            <TextInput
              style={[styles.inputField, { marginBottom: 0 }]}
              placeholder="City, State, Pincode (Optional)"
              placeholderTextColor="#94a3b8"
              value={billingLine2}
              onChangeText={setBillingLine2}
            />
          </View>

          {/* Card 3: Shipping Address (create-client.jpeg) */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Shipping Address</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Address Line 1 (Optional)"
              placeholderTextColor="#94a3b8"
              value={shippingLine1}
              onChangeText={setShippingLine1}
            />
            <TextInput
              style={[styles.inputField, { marginBottom: 0 }]}
              placeholder="City, State, Pincode (Optional)"
              placeholderTextColor="#94a3b8"
              value={shippingLine2}
              onChangeText={setShippingLine2}
            />
          </View>

          {/* Collapsible extra fields (create-client2.jpeg) */}
          {showMoreFields && (
            <>
              {/* Card 4: Tax Registration & License */}
              <View style={styles.card}>
                <Text style={styles.inputLabel}>Tax Registration Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Optional"
                  placeholderTextColor="#94a3b8"
                  value={taxRegName}
                  onChangeText={setTaxRegName}
                />

                <Text style={styles.inputLabel}>Tax Registration Number</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Optional"
                  placeholderTextColor="#94a3b8"
                  value={taxRegNumber}
                  onChangeText={setTaxRegNumber}
                />

                <Text style={styles.inputLabel}>License Number</Text>
                <TextInput
                  style={[styles.inputField, { marginBottom: 0 }]}
                  placeholder="Optional"
                  placeholderTextColor="#94a3b8"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                />
              </View>

              {/* Card 5: Client Detail (Not Shown on Invoice) with counter */}
              <View style={styles.card}>
                <View style={styles.cardHeadingRow}>
                  <Text style={styles.cardHeading}>Client Detail</Text>
                  <Text style={styles.cardHeadingSub}>(Not Shown on Invoice)</Text>
                </View>
                <TextInput
                  style={styles.textAreaField}
                  placeholder="Details"
                  placeholderTextColor="#94a3b8"
                  multiline
                  maxLength={1000}
                  value={notes}
                  onChangeText={setNotes}
                />
                <Text style={styles.charCounter}>{notes.length}/1000</Text>
              </View>
            </>
          )}

          {/* Toggle Show More / Show Less Fields button (create-client2.jpeg) */}
          <TouchableOpacity
            style={styles.toggleFieldsBtn}
            onPress={() => setShowMoreFields(!showMoreFields)}
          >
            <Text style={styles.toggleFieldsText}>
              {showMoreFields ? "Show Less Fields" : "Show More Fields"}
            </Text>
            <MaterialIcons
              name={showMoreFields ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color="#2563eb"
            />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f0f4f9",
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
    backgroundColor: "#f0f4f9",
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
    backgroundColor: "#cbd5e1",
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  importBtnWrap: {
    alignItems: "center",
    marginVertical: 12,
  },
  importContactsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  importContactsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  cardHeadingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  cardHeadingSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginLeft: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  textAreaField: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    height: 110,
    textAlignVertical: "top",
  },
  charCounter: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 6,
  },
  toggleFieldsBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  toggleFieldsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
});

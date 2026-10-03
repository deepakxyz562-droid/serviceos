import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { api, apiPost } from "@/api/client";
import {
  sanitizePhone,
  sanitizeGstin,
  isValidEmail,
  isValidPhone,
} from "@/lib/validation";

export interface CustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  [key: string]: any;
}

interface CustomerSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerItem) => void;
  selectedCustomerId?: string | null;
}

export function CustomerSelectModal({
  visible,
  onClose,
  onSelect,
  selectedCustomerId,
}: CustomerSelectModalProps) {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Subview for adding a new client
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCustomers();
    } else {
      setIsAddingNew(false);
      setSearch("");
    }
  }, [visible]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await api<any>("/api/customers");
      const list = res.customers || (Array.isArray(res) ? res : []);
      setCustomers(list);
    } catch (e: any) {
      console.warn("Failed to load customers:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function handleCreateCustomer() {
    if (!newName.trim()) {
      Alert.alert("Missing Name", "Customer name is required");
      return;
    }
    if (newPhone.trim() && !isValidPhone(newPhone)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number");
      return;
    }
    if (newEmail.trim() && !isValidEmail(newEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setSavingNew(true);
    try {
      const payload: any = {
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        address: newAddress.trim() || undefined,
      };

      if (newGstin.trim()) {
        payload.notes = JSON.stringify({ gstin: newGstin.trim().toUpperCase() });
      }

      const res = await apiPost<any>("/api/customers", payload);
      const created = res.customer || res;

      // Reset form
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
      setNewGstin("");
      setIsAddingNew(false);

      // Add to list and select immediately
      setCustomers((prev) => [created, ...prev]);
      onSelect(created);
      onClose();
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Could not create client");
    } finally {
      setSavingNew(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isAddingNew ? (
                <TouchableOpacity onPress={() => setIsAddingNew(false)} style={styles.backIconBtn}>
                  <MaterialIcons name="arrow-back" size={22} color="#1e293b" />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.headerTitle}>
                {isAddingNew ? "Add New Client" : "Select Client (Bill To)"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {isAddingNew ? (
            /* IN-LINE CLIENT CREATION FORM */
            <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <Text style={styles.inputLabel}>
                Client Name <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Business or Person Name"
                placeholderTextColor="#94a3b8"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={(t) => setNewPhone(sanitizePhone(t))}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="billing@client.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={styles.inputLabel}>Billing Address</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
                placeholder="Street address, City, State, PIN"
                placeholderTextColor="#94a3b8"
                multiline
                value={newAddress}
                onChangeText={setNewAddress}
              />

              <Text style={styles.inputLabel}>GSTIN / Tax ID</Text>
              <TextInput
                style={styles.textInput}
                placeholder="22AAAAA0000A1Z5"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={newGstin}
                onChangeText={(t) => setNewGstin(sanitizeGstin(t))}
              />

              <TouchableOpacity
                style={[styles.submitBtn, savingNew && { opacity: 0.7 }]}
                onPress={handleCreateCustomer}
                disabled={savingNew}
              >
                {savingNew ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Save & Select Client</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* CLIENT SEARCH & LIST */
            <View style={{ flex: 1 }}>
              {/* Search Bar & Add Client Trigger */}
              <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                  <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, phone, email..."
                    placeholderTextColor="#94a3b8"
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <MaterialIcons name="cancel" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.addClientBtn}
                  onPress={() => setIsAddingNew(true)}
                >
                  <MaterialIcons name="person-add" size={18} color="#ffffff" />
                  <Text style={styles.addClientBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              ) : (
                <ScrollView
                  style={styles.listScroll}
                  contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
                >
                  {filteredCustomers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="people-outline" size={48} color="#cbd5e1" />
                      <Text style={styles.emptyTitle}>No clients found</Text>
                      <Text style={styles.emptySub}>
                        {search ? "No clients match your search query." : "You have not added any clients yet."}
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyAddBtn}
                        onPress={() => setIsAddingNew(true)}
                      >
                        <Text style={styles.emptyAddBtnText}>+ Create New Client</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const isSelected = selectedCustomerId === cust.id;
                      return (
                        <TouchableOpacity
                          key={cust.id}
                          style={[styles.clientCard, isSelected && styles.clientCardSelected]}
                          onPress={() => {
                            onSelect(cust);
                            onClose();
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.clientAvatar}>
                            <Text style={styles.clientAvatarText}>
                              {cust.name ? cust.name.charAt(0).toUpperCase() : "C"}
                            </Text>
                          </View>

                          <View style={styles.clientInfo}>
                            <Text style={styles.clientName} numberOfLines={1}>
                              {cust.name}
                            </Text>
                            {cust.phone ? (
                              <View style={styles.metaRow}>
                                <Feather name="phone" size={12} color="#64748b" />
                                <Text style={styles.metaText}>{cust.phone}</Text>
                              </View>
                            ) : null}
                            {cust.email ? (
                              <View style={styles.metaRow}>
                                <Feather name="mail" size={12} color="#64748b" />
                                <Text style={styles.metaText}>{cust.email}</Text>
                              </View>
                            ) : null}
                            {cust.address ? (
                              <View style={styles.metaRow}>
                                <Feather name="map-pin" size={12} color="#94a3b8" />
                                <Text style={[styles.metaText, { color: "#94a3b8" }]} numberOfLines={1}>
                                  {cust.address}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioInnerDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  backIconBtn: {
    padding: 4,
    marginRight: 4,
  },
  closeBtn: {
    padding: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    padding: 0,
  },
  addClientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addClientBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  listScroll: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  clientCardSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  clientAvatarText: {
    color: "#ea580c",
    fontSize: 16,
    fontWeight: "800",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioCircleSelected: {
    borderColor: "#2563eb",
  },
  radioInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563eb",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyAddBtnText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
  },
  formScroll: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Contact, ContactField, requestPermissionsAsync } from "expo-contacts";
import { Feather } from "@expo/vector-icons";

export interface SelectedContact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
}

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (contact: SelectedContact) => void;
}

interface ContactListItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
}

export function ContactPickerModal({ visible, onClose, onSelect }: ContactPickerModalProps) {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant contacts permission to import clients directly from your phone."
        );
        onClose();
        return;
      }

      // Query contacts
      const items = await Contact.getAllDetails(
        [
          ContactField.GIVEN_NAME,
          ContactField.MIDDLE_NAME,
          ContactField.FAMILY_NAME,
          ContactField.PHONES,
          ContactField.EMAILS,
          ContactField.ADDRESSES,
          ContactField.COMPANY,
        ],
        { limit: 200 }
      );

      if (items && items.length > 0) {
        const formatted: ContactListItem[] = items
          .map((c: any, idx: number) => {
            const fullName = [c.givenName, c.middleName, c.familyName].filter(Boolean).join(" ").trim() ||
              c.organizationName ||
              "";
            const phone = (c.phones?.[0]?.number || "").replace(/[\s\-()]/g, "");
            const email = c.emails?.[0]?.address || "";
            const addrObj = c.addresses?.[0];
            const address = addrObj
              ? [addrObj.street, addrObj.city, addrObj.region, addrObj.postalCode]
                  .filter(Boolean)
                  .join(", ")
              : "";
            const company = c.organizationName || "";

            return {
              id: c.id || String(idx),
              name: fullName,
              phone,
              email,
              address,
              company,
            };
          })
          .filter((c: ContactListItem) => Boolean(c.name || c.phone));

        setContacts(formatted);
      }
    } catch {
      // In case getAllDetails fails (e.g. on certain sandboxes), we can allow presentPicker fallback
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchNativePicker = async () => {
    try {
      const picked = await Contact.presentPicker();
      if (picked) {
        const details: any = await picked.getDetails([
          ContactField.GIVEN_NAME,
          ContactField.MIDDLE_NAME,
          ContactField.FAMILY_NAME,
          ContactField.PHONES,
          ContactField.EMAILS,
          ContactField.ADDRESSES,
          ContactField.COMPANY,
        ]);
        const name = [details.givenName, details.middleName, details.familyName].filter(Boolean).join(" ").trim() ||
          details.organizationName ||
          "Customer";
        const phone = (details.phones?.[0]?.number || "").replace(/[\s\-()]/g, "");
        const email = details.emails?.[0]?.address || "";
        const addrObj = details.addresses?.[0];
        const address = addrObj
          ? [addrObj.street, addrObj.city, addrObj.region, addrObj.postalCode].filter(Boolean).join(", ")
          : "";
        const company = details.organizationName || "";

        onSelect({ name, phone, email, address, company });
        onClose();
      }
    } catch (err: any) {
      Alert.alert("Picker Error", err.message || "Could not open system contact picker.");
    }
  };

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const phoneMatch = c.phone?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    return nameMatch || phoneMatch || emailMatch;
  });

  const handlePickItem = (item: ContactListItem) => {
    onSelect({
      name: item.name || "Customer",
      phone: item.phone,
      email: item.email,
      address: item.address,
      company: item.company,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Import from Contacts</Text>
              <Text style={styles.subtitle}>Select a contact to auto-fill customer details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Quick System Picker Trigger */}
          <TouchableOpacity
            style={styles.systemPickerBtn}
            onPress={handleLaunchNativePicker}
            activeOpacity={0.8}
          >
            <Feather name="user-check" size={16} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={styles.systemPickerText}>Open System Contact Picker</Text>
          </TouchableOpacity>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Feather name="search" size={17} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone or email..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Reading phone contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handlePickItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.name?.[0] || "C").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={styles.contactSub}>
                        <Feather name="phone" size={11} color="#64748b" /> {item.phone}
                      </Text>
                    ) : null}
                    {item.email ? (
                      <Text style={styles.contactSub}>
                        <Feather name="mail" size={11} color="#64748b" /> {item.email}
                      </Text>
                    ) : null}
                  </View>
                  <Feather name="chevron-right" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No matching contacts found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    height: "82%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  systemPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingVertical: 9,
    marginBottom: 10,
  },
  systemPickerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748b",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563eb",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
  },
});

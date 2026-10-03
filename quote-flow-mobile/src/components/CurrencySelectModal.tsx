import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { WORLD_CURRENCIES, type CurrencyItem } from "@/lib/currencies";

interface CurrencySelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: CurrencyItem) => void;
  selectedCode?: string;
}

export function CurrencySelectModal({
  visible,
  onClose,
  onSelect,
  selectedCode = "INR",
}: CurrencySelectModalProps) {
  const [search, setSearch] = useState("");

  const filteredCurrencies = useMemo(() => {
    if (!search.trim()) return WORLD_CURRENCIES;
    const q = search.toLowerCase();
    return WORLD_CURRENCIES.filter(
      (c) =>
        c.country.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Currency</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country, code (USD, INR)..."
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
          </View>

          {/* Currency List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
          >
            {filteredCurrencies.map((c, idx) => {
              const isSelected = selectedCode?.toUpperCase() === c.code.toUpperCase();
              return (
                <TouchableOpacity
                  key={`${c.code}-${idx}`}
                  style={[styles.currencyRow, isSelected && styles.currencyRowSelected]}
                  onPress={() => {
                    onSelect(c);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.symbolBox}>
                    <Text style={styles.symbolText}>{c.symbol}</Text>
                  </View>

                  <View style={styles.currencyInfo}>
                    <Text style={styles.countryName}>{c.country}</Text>
                    <Text style={styles.codeText}>{c.code}</Text>
                  </View>

                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <MaterialIcons name="check" size={16} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: "80%",
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
  closeBtn: {
    padding: 4,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchWrap: {
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
  listScroll: {
    flex: 1,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  currencyRowSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  symbolBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  currencyInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  codeText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
});

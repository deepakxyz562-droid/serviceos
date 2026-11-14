import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { apiPost } from "@/api/client";

interface RecordPaymentModalProps {
  visible: boolean;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currencySymbol?: string;
  onClose: () => void;
  onPaymentRecorded: (payment: any, newBalance: number) => void;
}

const PAYMENT_METHODS = [
  { id: "UPI", label: "UPI", icon: "qrcode" },
  { id: "CASH", label: "Cash", icon: "money-bill-wave" },
  { id: "BANK_TRANSFER", label: "Bank Transfer", icon: "university" },
  { id: "CHEQUE", label: "Cheque", icon: "money-check" },
  { id: "CARD", label: "Card", icon: "credit-card" },
  { id: "OTHER", label: "Other", icon: "receipt" },
];

export function RecordPaymentModal({
  visible,
  invoiceId,
  invoiceNumber,
  totalAmount,
  paidAmount,
  balanceAmount,
  currencySymbol = "₹",
  onClose,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [amountStr, setAmountStr] = useState(String(Math.max(0, balanceAmount)));
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmountStr(String(Math.max(0, balanceAmount)));
      setReference("");
      setNotes("");
    }
  }, [visible, balanceAmount]);

  const handleRecord = async () => {
    const entered = parseFloat(amountStr);
    if (isNaN(entered) || entered <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount greater than zero.");
      return;
    }

    if (entered > balanceAmount + 0.01) {
      Alert.alert(
        "Overpayment Warning",
        `Entered amount (${currencySymbol}${entered}) exceeds outstanding balance (${currencySymbol}${balanceAmount}). Do you wish to continue?`,
        [
          { text: "Edit Amount", style: "cancel" },
          { text: "Confirm", onPress: () => submitPayment(entered) },
        ]
      );
      return;
    }

    await submitPayment(entered);
  };

  const submitPayment = async (amount: number) => {
    setLoading(true);
    try {
      const res = await apiPost<{ payment: any; summary?: { outstanding: number } }>(
        `/api/invoices/${invoiceId}/payments`,
        {
          amount,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          paidAt: new Date().toISOString(),
        }
      );

      const newBalance = Math.max(0, balanceAmount - amount);
      Alert.alert(
        "Payment Recorded",
        `Successfully logged ${currencySymbol}${amount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })} via ${method}.`
      );
      onPaymentRecorded(res?.payment || { amount, method }, newBalance);
      onClose();
    } catch (err: any) {
      Alert.alert("Failed to Record Payment", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Record Payment</Text>
              <Text style={styles.subtitle}>Invoice {invoiceNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Balance Overview Banner */}
            <View style={styles.overviewBox}>
              <View style={styles.overviewCol}>
                <Text style={styles.overviewLabel}>Total Invoice</Text>
                <Text style={styles.overviewValue}>
                  {currencySymbol}{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.overviewCol}>
                <Text style={styles.overviewLabel}>Already Paid</Text>
                <Text style={[styles.overviewValue, { color: "#10b981" }]}>
                  {currencySymbol}{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.overviewCol}>
                <Text style={styles.overviewLabel}>Balance Due</Text>
                <Text style={[styles.overviewValue, { color: "#2563eb", fontWeight: "800" }]}>
                  {currencySymbol}{balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Amount Input */}
            <Text style={styles.fieldLabel}>Amount Received *</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                autoFocus
              />
              {balanceAmount > 0 && (
                <TouchableOpacity
                  style={styles.fullAmountBtn}
                  onPress={() => setAmountStr(String(balanceAmount))}
                >
                  <Text style={styles.fullAmountBtnText}>Pay Full</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.fieldLabel}>Payment Mode *</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHODS.map((m) => {
                const isSelected = method === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodCard, isSelected && styles.methodCardActive]}
                    onPress={() => setMethod(m.id)}
                    activeOpacity={0.8}
                  >
                    <FontAwesome5
                      name={m.icon}
                      size={15}
                      color={isSelected ? "#2563eb" : "#64748b"}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[styles.methodText, isSelected && styles.methodTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reference Number / UTR */}
            <Text style={styles.fieldLabel}>Reference / Transaction ID (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. UTR / UPI Ref / Cheque No"
              placeholderTextColor="#94a3b8"
            />

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, { height: 60, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Received via PhonePe QR"
              placeholderTextColor="#94a3b8"
              multiline
            />
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
              onPress={handleRecord}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnText}>Save Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
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
  body: {
    marginBottom: 16,
  },
  overviewBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  overviewCol: {
    flex: 1,
    alignItems: "center",
  },
  dividerVertical: {
    width: 1,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 4,
  },
  overviewLabel: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
  },
  overviewValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: "#ffffff",
    marginBottom: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  fullAmountBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  fullAmountBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  methodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  methodCard: {
    width: "31%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  methodCardActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  methodText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },
  methodTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});

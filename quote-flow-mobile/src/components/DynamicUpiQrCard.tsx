import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Clipboard,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";

interface DynamicUpiQrCardProps {
  upiId?: string | null;
  businessName?: string | null;
  amount: number;
  invoiceNumber?: string | null;
  currency?: string;
  currencySymbol?: string;
  accentColor?: string;
  isPaid?: boolean;
  compact?: boolean;
}

export function buildUpiPaymentUrl(options: {
  upiId: string;
  businessName?: string | null;
  amount: number;
  invoiceNumber?: string | null;
  currency?: string;
}): string {
  const { upiId, businessName = "Merchant", amount, invoiceNumber = "", currency = "INR" } = options;
  const cleanUpi = (upiId || "").trim();
  const cleanName = (businessName || "Merchant").trim();
  const cleanNote = invoiceNumber ? `Invoice ${invoiceNumber}` : "Invoice Payment";
  const formattedAmount = amount > 0 ? amount.toFixed(2) : "0.00";

  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${formattedAmount}&cu=${encodeURIComponent(currency)}&tn=${encodeURIComponent(cleanNote)}`;
}

export function DynamicUpiQrCard({
  upiId,
  businessName,
  amount,
  invoiceNumber,
  currency = "INR",
  currencySymbol = "₹",
  accentColor = "#2563eb",
  isPaid = false,
  compact = false,
}: DynamicUpiQrCardProps) {
  const [copied, setCopied] = useState(false);

  if (!upiId || !upiId.trim()) {
    return null;
  }

  const cleanUpi = upiId.trim();
  const upiUrl = buildUpiPaymentUrl({
    upiId: cleanUpi,
    businessName,
    amount,
    invoiceNumber,
    currency,
  });

  const handleOpenUpi = async () => {
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        // Fallback: try opening anyway or alert
        await Linking.openURL(upiUrl).catch(() => {
          Alert.alert(
            "UPI App",
            `Scan the QR code with GPay, PhonePe, Paytm or BHIM on your phone.\n\nUPI ID: ${cleanUpi}`
          );
        });
      }
    } catch {
      Alert.alert(
        "Scan to Pay",
        `Use any UPI app on another phone to scan this QR code, or transfer directly to ${cleanUpi}`
      );
    }
  };

  const handleCopyUpi = () => {
    Clipboard.setString(cleanUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isPaid || amount <= 0) {
    return (
      <View style={[styles.card, compact && styles.cardCompact, { borderColor: "#10b981" }]}>
        <View style={styles.paidHeader}>
          <MaterialIcons name="check-circle" size={24} color="#10b981" />
          <Text style={styles.paidTitle}>Payment Received</Text>
        </View>
        <Text style={styles.paidSubtitle}>This invoice has been settled in full.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact, { borderColor: "#e2e8f0" }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <FontAwesome5 name="qrcode" size={16} color={accentColor} style={{ marginRight: 6 }} />
          <Text style={[styles.title, { color: accentColor }]}>Instant UPI Payment</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>AUTO-FILLED</Text>
        </View>
      </View>

      <Text style={styles.subText}>
        Scan with any UPI app to pay {currencySymbol}{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </Text>

      <View style={styles.qrWrapper}>
        <View style={styles.qrInner}>
          <QRCode
            value={upiUrl}
            size={compact ? 110 : 136}
            color="#0f172a"
            backgroundColor="#ffffff"
            quietZone={8}
          />
        </View>
      </View>

      {/* Payee Details */}
      <View style={styles.detailsRow}>
        <TouchableOpacity style={styles.upiPill} onPress={handleCopyUpi} activeOpacity={0.75}>
          <Text style={styles.upiPillLabel}>UPI ID: </Text>
          <Text style={styles.upiPillValue} numberOfLines={1}>
            {cleanUpi}
          </Text>
          <Feather
            name={copied ? "check" : "copy"}
            size={13}
            color={copied ? "#10b981" : "#64748b"}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      {/* Supported App Icons Row */}
      <View style={styles.appsRow}>
        <Text style={styles.appsText}>Works with GPay, PhonePe, Paytm, BHIM & all UPI apps</Text>
      </View>

      {/* Action Button: Tap to open UPI directly */}
      <TouchableOpacity
        style={[styles.payBtn, { backgroundColor: accentColor }]}
        onPress={handleOpenUpi}
        activeOpacity={0.88}
      >
        <FontAwesome5 name="mobile-alt" size={14} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.payBtnText}>Pay via UPI App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardCompact: {
    padding: 10,
    marginVertical: 6,
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 4,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.5,
  },
  subText: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 10,
    textAlign: "center",
  },
  qrWrapper: {
    padding: 8,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  qrInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  detailsRow: {
    marginTop: 2,
    marginBottom: 6,
  },
  upiPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  upiPillLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  upiPillValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
    maxWidth: 160,
  },
  appsRow: {
    marginBottom: 10,
  },
  appsText: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
  },
  payBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
  },
  payBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  paidHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  paidTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10b981",
    marginLeft: 6,
  },
  paidSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
});

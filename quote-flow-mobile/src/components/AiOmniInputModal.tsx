import React, { useState } from "react";
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
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { api } from "@/api/client";

interface AiOmniInputModalProps {
  visible: boolean;
  onClose: () => void;
  onParsed: (draft: any) => void;
}

export function AiOmniInputModal({ visible, onClose, onParsed }: AiOmniInputModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "paste" | "prompt">("voice");
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  async function handleParse(overrideText?: string) {
    const text = overrideText || textInput;
    if (!text || text.trim().length < 3) {
      Alert.alert("Input needed", "Please speak, paste, or type a description first");
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ success: boolean; draft: any }>("/api/quote-flow/ai-parse", {
        method: "POST",
        body: JSON.stringify({
          text,
          mode: activeTab,
        }),
      });

      if (res?.draft) {
        onParsed(res.draft);
        onClose();
      } else {
        throw new Error("Unable to parse document details");
      }
    } catch (err: any) {
      Alert.alert("AI Assistant", err.message || "Failed to parse text. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleVoice() {
    if (isRecording) {
      setIsRecording(false);
      if (!textInput) {
        setTextInput("Invoice Sarah $1,200 for 3 days of consulting, payment due in 15 days");
      }
    } else {
      setIsRecording(true);
      setTextInput("");
      const words = [
        "Quote",
        "Sarah",
        "for",
        "website",
        "redesign:",
        "homepage",
        "$800,",
        "5",
        "pages",
        "$1,000,",
        "SEO",
        "setup",
        "$300,",
        "50%",
        "deposit.",
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          setTextInput((prev) => (prev ? prev + " " + words[i] : words[i]));
          i++;
        } else {
          clearInterval(interval);
          setIsRecording(false);
        }
      }, 250);
    }
  }

  function handleDemoPaste() {
    setTextInput(
      "Hi Alex, please send quote for office lighting renovation. 6 LED panel fittings $450, rewiring labor $380, switchboard upgrade $220. 10% discount if done this week."
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Feather name="zap" size={20} color="#10b981" />
              </View>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.title}>AI Document Creator</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>2026 CORE</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>Describe it. We create it.</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab("voice")}
              style={[styles.tabBtn, activeTab === "voice" && styles.tabBtnActive]}
            >
              <MaterialIcons name="mic" size={16} color={activeTab === "voice" ? "#0f172a" : "#64748b"} />
              <Text style={[styles.tabText, activeTab === "voice" && styles.tabTextActive]}>Speak</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("paste")}
              style={[styles.tabBtn, activeTab === "paste" && styles.tabBtnActive]}
            >
              <MaterialIcons name="content-paste" size={16} color={activeTab === "paste" ? "#0f172a" : "#64748b"} />
              <Text style={[styles.tabText, activeTab === "paste" && styles.tabTextActive]}>Paste Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("prompt")}
              style={[styles.tabBtn, activeTab === "prompt" && styles.tabBtnActive]}
            >
              <MaterialIcons name="edit" size={16} color={activeTab === "prompt" ? "#0f172a" : "#64748b"} />
              <Text style={[styles.tabText, activeTab === "prompt" && styles.tabTextActive]}>Prompt</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {activeTab === "voice" && (
              <View style={styles.voiceBox}>
                <TouchableOpacity
                  onPress={toggleVoice}
                  style={[styles.micBigBtn, isRecording && styles.micBigBtnRecording]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="mic" size={40} color="white" />
                </TouchableOpacity>
                <Text style={styles.voiceStatus}>
                  {isRecording ? "Listening to your voice..." : "Tap mic to speak"}
                </Text>
                <Text style={styles.voiceSub}>
                  e.g. &ldquo;Invoice Sarah $1,200 for 3 days consulting due in 15 days&rdquo;
                </Text>

                {textInput ? (
                  <View style={styles.transcriptCard}>
                    <Text style={styles.transcriptLabel}>Transcript:</Text>
                    <Text style={styles.transcriptText}>&ldquo;{textInput}&rdquo;</Text>
                  </View>
                ) : null}

                {/* Sample quick voice prompts */}
                <View style={styles.quickChips}>
                  {[
                    "Invoice Sarah $1,200 for 3 days consulting",
                    "Quote John redesign $2,100, 50% deposit",
                    "Plumbing repair $250 labor + $95 parts",
                  ].map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setTextInput(s);
                        handleParse(s);
                      }}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>✦ {s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTab === "paste" && (
              <View>
                <View style={styles.pasteHeader}>
                  <Text style={styles.inputLabel}>Paste WhatsApp / Email Request:</Text>
                  <TouchableOpacity onPress={handleDemoPaste} style={styles.pasteDemoBtn}>
                    <Text style={styles.pasteDemoText}>Insert Demo</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  multiline
                  numberOfLines={4}
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="Paste WhatsApp message here..."
                  style={styles.textarea}
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.hint}>
                  AI automatically extracts client name, line items, prices, and discounts.
                </Text>
              </View>
            )}

            {activeTab === "prompt" && (
              <View>
                <Text style={styles.inputLabel}>Describe the document:</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="e.g. Create quote for Acme Studio for $1,500 consulting retainer with 18% GST"
                  style={styles.textarea}
                  placeholderTextColor="#94a3b8"
                />
                <View style={styles.quickChips}>
                  {[
                    "3-Tier Quote (Good / Better / Best) for Web Project",
                    "Invoice Mike 1200 dollars consulting due in 15 days",
                    "HVAC AC repair 2 units $300 + gas $120",
                  ].map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setTextInput(chip)}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.generateBtn, loading && styles.btnDisabled]}
              onPress={() => handleParse()}
              disabled={loading || !textInput.trim()}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.generateBtnText}>Generate Document with AI</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  badge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#15803d",
    fontSize: 9,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: "white",
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#0f172a",
    fontWeight: "bold",
  },
  body: {
    maxHeight: 400,
  },
  voiceBox: {
    alignItems: "center",
    paddingVertical: 12,
  },
  micBigBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  micBigBtnRecording: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  voiceStatus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  voiceSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  transcriptCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    fontStyle: "italic",
  },
  quickChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    justifyContent: "center",
  },
  chip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  pasteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  pasteDemoBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pasteDemoText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2563eb",
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
    textAlignVertical: "top",
    minHeight: 90,
  },
  hint: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
  },
  generateBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

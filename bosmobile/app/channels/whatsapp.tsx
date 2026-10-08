import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  TextInput,
  Linking,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

type WhatsAppConfig = {
  phone?: string;
  // Legacy key — older server rows stored the phone number under
  // `phoneNumber` instead of `phone`. Kept here for read-side backward-compat.
  phoneNumber?: string;
  displayName?: string;
  aiAutoResponder?: boolean;
  takeoverAlerts?: boolean;
  leadCaptureEnabled?: boolean;
  triggerKeywords?: string;
  greetingMessage?: string;
};

export default function WhatsAppChannelScreen() {
  const router = useRouter();

  const [aiAutoResponder, setAiAutoResponder] = useState(true);
  const [takeoverAlerts, setTakeoverAlerts] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // connect / disconnect in-flight
  const [persistingConfig, setPersistingConfig] = useState(false); // toggle / text-input save in-flight

  // Internal config mirrors what's stored server-side. The UI only edits a
  // subset (phone + 2 toggles), but we still round-trip the rest so the web
  // dashboard's settings (greeting, keywords, lead capture, displayName) are
  // preserved when the mobile app persists a toggle change.
  const configRef = useRef<WhatsAppConfig>({});

  // Phone-entry modal (Android-compatible replacement for Alert.prompt)
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    apiRequest<any[]>(API_PATHS.channels)
      .then((channels) => {
        if (Array.isArray(channels)) {
          const wa = channels.find((c) => c.type === 'whatsapp' || c.channel === 'whatsapp');
          if (wa) {
            const cfg: WhatsAppConfig = (wa.config && typeof wa.config === 'object') ? wa.config : {};
            configRef.current = cfg;
            setIsConnected(!!wa.connected || wa.status === 'active');
            // Backward-compat: server may store phone under either key
            const storedPhone = cfg.phone ?? cfg.phoneNumber ?? '';
            if (storedPhone) setPhone(storedPhone);
            if (typeof cfg.aiAutoResponder === 'boolean') setAiAutoResponder(cfg.aiAutoResponder);
            if (typeof cfg.takeoverAlerts === 'boolean') setTakeoverAlerts(cfg.takeoverAlerts);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildConfig = useCallback((): WhatsAppConfig => {
    return {
      ...configRef.current,
      phone,
      aiAutoResponder,
      takeoverAlerts,
    };
  }, [phone, aiAutoResponder, takeoverAlerts]);

  // Upsert the channel config to the backend. The route requires `channel` +
  // `name`; we also send `type` / `provider` for forward-compat (ignored).
  const persistConfig = useCallback(
    async (overrides?: Partial<WhatsAppConfig> & { connected?: boolean; status?: string }) => {
      const mergedConfig: WhatsAppConfig = { ...buildConfig(), ...(overrides || {}) };
      // Mirror merged values into the ref so subsequent saves preserve them
      configRef.current = mergedConfig;
      const connected = overrides?.connected ?? isConnected;
      const status = overrides?.status ?? (connected ? 'active' : 'inactive');
      setPersistingConfig(true);
      try {
        await apiRequest(API_PATHS.channels, {
          method: 'POST',
          body: {
            channel: 'whatsapp',
            type: 'whatsapp',
            name: 'WhatsApp',
            provider: 'whatsapp',
            connected,
            status,
            config: mergedConfig,
          },
        });
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to save WhatsApp settings.';
        Alert.alert('Save Failed', msg);
      } finally {
        setPersistingConfig(false);
      }
    },
    [buildConfig, isConnected]
  );

  const connectWhatsApp = useCallback(async (_phoneValue: string) => {
    setPhoneModalVisible(false);
    await Linking.openURL(`${API_BASE_URL}/?view=channels`).catch(() => Alert.alert('Browser unavailable', 'Open the web dashboard to connect WhatsApp.'));
  }, []);

  const openPhoneModal = () => void connectWhatsApp('');
  const handleConnectMeta = () => void connectWhatsApp('');

  const handleDisconnect = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Disconnect WhatsApp',
      'Are you sure you want to disconnect WhatsApp Business? Your AI agent will no longer respond to incoming messages on this number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiRequest(API_PATHS.channels, {
                method: 'POST',
                body: {
                  channel: 'whatsapp',
                  type: 'whatsapp',
                  name: 'WhatsApp',
                  provider: 'whatsapp',
                  connected: false,
                  status: 'inactive',
                  config: buildConfig(),
                },
              });
              setIsConnected(false);
              setPhone('');
              configRef.current = {};
            } catch (err) {
              const msg = err instanceof ApiError ? err.message : 'Failed to disconnect WhatsApp. Please try again.';
              Alert.alert('Disconnect Failed', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp Business</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.whatsappIconCircle}>
            <FontAwesome name="whatsapp" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Bring WhatsApp chats into your inbox</Text>
          <Text style={styles.heroDesc}>
            Reach your customers on WhatsApp. Answer inquiries, take orders, and send automated status updates directly from your AI employee.
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color="#25D366" />
          ) : isConnected ? (
            <View style={styles.connectedPillRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedPhoneText}>
                {phone || 'WhatsApp Business'} · Active & Linked
              </Text>
            </View>
          ) : submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#25D366" />
              <Text style={styles.submittingText}>Connecting…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectMetaBtn}
              onPress={handleConnectMeta}
              activeOpacity={0.8}
            >
              <FontAwesome name="whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectMetaBtnText}>Connect WhatsApp Business</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requirements Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checkTitle}>WhatsApp Automation Capabilities:</Text>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Instant AI replies to all customer inquiries</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Order tracking and "Food Ready" pickup alerts</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Itemized digital receipt generation</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.sectionHeader}>WHATSAPP AI AUTOMATION</Text>
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>AI Auto-Pilot Responder</Text>
              <Text style={styles.settingSubtitle}>
                Allow AI to reply automatically to incoming inquiries within 5 seconds.
              </Text>
            </View>
            <Switch
              value={aiAutoResponder}
              onValueChange={(val) => {
                hapticFeedback.light();
                setAiAutoResponder(val);
                persistConfig({ aiAutoResponder: val });
              }}
              trackColor={{ false: '#CBD5E1', true: '#25D366' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>Live Takeover Push Notifications</Text>
              <Text style={styles.settingSubtitle}>
                Notify your mobile app immediately when a customer asks for a human.
              </Text>
            </View>
            <Switch
              value={takeoverAlerts}
              onValueChange={(val) => {
                hapticFeedback.light();
                setTakeoverAlerts(val);
                persistConfig({ takeoverAlerts: val });
              }}
              trackColor={{ false: '#CBD5E1', true: '#25D366' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Actions */}
        {isConnected ? (
          <TouchableOpacity
            style={[styles.disconnectBtn, submitting && { opacity: 0.6 }]}
            onPress={handleDisconnect}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#E11D48" />
            ) : (
              <Text style={styles.disconnectBtnText}>Disconnect WhatsApp</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.manualBtn, submitting && { opacity: 0.6 }]}
            onPress={openPhoneModal}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <Text style={styles.manualBtnText}>Quick Connect with Store Number</Text>
            )}
          </TouchableOpacity>
        )}

        {persistingConfig && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color="#64748B" />
            <Text style={styles.savingText}>Saving settings…</Text>
          </View>
        )}
      </ScrollView>

      {/* Phone-Entry Modal (Android-compatible replacement for Alert.prompt) */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>WhatsApp Phone Number</Text>
            <Text style={styles.modalSubtitle}>
              Enter your business WhatsApp number with country code (e.g. +91 9876543210). Your AI agent will start responding on this number.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+91 9876543210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPhoneModalVisible(false)}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConnectBtn, submitting && { opacity: 0.6 }]}
                onPress={() => connectWhatsApp(phoneInput)}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConnectText}>Connect</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  whatsappIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  connectedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  connectedPhoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  connectMetaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  connectMetaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    gap: 8,
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  disconnectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  disconnectBtnText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '700',
  },
  manualBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  manualBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  submittingText: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '700',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  savingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConnectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#25D366',
  },
  modalConnectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

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
  Linking,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

type MessengerConfig = {
  pageName?: string;
  pageId?: string;
  aiAutoResponder?: boolean;
  greetingMessage?: string;
  triggerKeywords?: string;
  leadCaptureEnabled?: boolean;
  takeoverAlerts?: boolean;
};

export default function MessengerChannelScreen() {
  const router = useRouter();

  const [isConnected, setIsConnected] = useState(false);
  const [pageName, setPageName] = useState('');
  const [aiAutoResponder, setAiAutoResponder] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState(
    'Hi there! Thanks for reaching out. How can our team and AI assistant help you today?'
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [persistingConfig, setPersistingConfig] = useState(false);

  // Mirror of server-side config. The UI edits a subset (pageName + toggle +
  // greeting) but we round-trip the rest so the web dashboard's settings
  // (triggerKeywords, leadCaptureEnabled, takeoverAlerts, pageId) are
  // preserved when the mobile app saves a toggle change.
  const configRef = useRef<MessengerConfig>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiRequest<any[]>(API_PATHS.channels)
      .then((channels) => {
        if (Array.isArray(channels)) {
          const fb = channels.find((c) => c.type === 'messenger' || c.channel === 'messenger');
          if (fb) {
            const cfg: MessengerConfig = (fb.config && typeof fb.config === 'object') ? fb.config : {};
            configRef.current = cfg;
            setIsConnected(!!fb.connected || fb.status === 'active');
            if (typeof cfg.pageName === 'string') setPageName(cfg.pageName);
            if (typeof cfg.greetingMessage === 'string') setGreetingMessage(cfg.greetingMessage);
            if (typeof cfg.aiAutoResponder === 'boolean') setAiAutoResponder(cfg.aiAutoResponder);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildConfig = useCallback((): MessengerConfig => {
    return {
      ...configRef.current,
      pageName,
      aiAutoResponder,
      greetingMessage,
    };
  }, [pageName, aiAutoResponder, greetingMessage]);

  const persistConfig = useCallback(
    async (overrides?: Partial<MessengerConfig> & { connected?: boolean; status?: string }) => {
      const mergedConfig: MessengerConfig = { ...buildConfig(), ...(overrides || {}) };
      configRef.current = mergedConfig;
      const connected = overrides?.connected ?? isConnected;
      const status = overrides?.status ?? (connected ? 'active' : 'inactive');
      setPersistingConfig(true);
      try {
        await apiRequest(API_PATHS.channels, {
          method: 'POST',
          body: {
            channel: 'messenger',
            type: 'messenger',
            name: 'Messenger',
            provider: 'meta',
            connected,
            status,
            config: mergedConfig,
          },
        });
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to save Messenger settings.';
        Alert.alert('Save Failed', msg);
      } finally {
        setPersistingConfig(false);
      }
    },
    [buildConfig, isConnected]
  );

  const connectMessenger = useCallback(async () => {
    setSubmitting(true);
    try {
      const config: MessengerConfig = { ...buildConfig() };
      configRef.current = config;
      await apiRequest(API_PATHS.channels, {
        method: 'POST',
        body: {
          channel: 'messenger',
          type: 'messenger',
          name: 'Messenger',
          provider: 'meta',
          connected: true,
          status: 'active',
          config,
        },
      });
      setIsConnected(true);
      hapticFeedback.success();
      Alert.alert(
        'Messenger Connected',
        'Your Facebook Messenger channel has been activated. If you have not yet completed the Meta OAuth in your web dashboard, please do so to enable live page-message auto-reply.'
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to connect Messenger. Please try again.';
      Alert.alert('Connection Failed', msg);
    } finally {
      setSubmitting(false);
    }
  }, [buildConfig]);

  const handleConnectFacebook = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Connect Facebook Page',
      'Select your Facebook Business Page to allow GPTForm AI agent to respond to Messenger chats.\n\nOpen Meta OAuth authentication in browser?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect Meta OAuth',
          onPress: () => {
            const oauthUrl = `${API_BASE_URL}/api/oauth/facebook/callback`;
            Linking.openURL(oauthUrl).catch(() => {
              Alert.alert('Browser Error', 'Could not open Meta OAuth. Please try from your desktop dashboard.');
            });
          },
        },
        {
          text: 'Mark Connected',
          onPress: () => {
            connectMessenger();
          },
        },
      ]
    );
  };

  const handleToggleAutoResponder = (val: boolean) => {
    hapticFeedback.light();
    setAiAutoResponder(val);
    persistConfig({ aiAutoResponder: val });
  };

  const handleGreetingChange = (val: string) => {
    setGreetingMessage(val);
    // Debounce text-input persistence to avoid one POST per keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistConfig({ greetingMessage: val });
    }, 700);
  };

  const handleDisconnect = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Disconnect Messenger',
      'Are you sure you want to disconnect Facebook Messenger? Your AI agent will no longer respond to incoming page messages.',
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
                  channel: 'messenger',
                  type: 'messenger',
                  name: 'Messenger',
                  provider: 'meta',
                  connected: false,
                  status: 'inactive',
                  config: buildConfig(),
                },
              });
              setIsConnected(false);
              setPageName('');
              configRef.current = {};
            } catch (err) {
              const msg = err instanceof ApiError ? err.message : 'Failed to disconnect Messenger. Please try again.';
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
        <Text style={styles.headerTitle}>Facebook Messenger</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.messengerIconCircle}>
            <FontAwesome5 name="facebook-messenger" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Connect Facebook Page Messenger</Text>
          <Text style={styles.heroDesc}>
            Reply instantly to customers messaging your Facebook Page. Capture leads, schedule quotes, and answer service inquiries 24/7.
          </Text>

          {isConnected ? (
            <View style={styles.connectedPillRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedPageText}>
                {pageName ? pageName : 'Facebook Page'} · Active & Synced
              </Text>
            </View>
          ) : submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#0084FF" />
              <Text style={styles.submittingText}>Connecting…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnectFacebook}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="facebook-messenger" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectBtnText}>Connect Facebook Page</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Benefits Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checkTitle}>Messenger Integration Features:</Text>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Instant AI responses within Facebook's 24-hr policy</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Syncs directly into your unified Mobile Inbox</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Auto-creates lead cards with contact details</Text>
          </View>
        </View>

        {/* Automation Settings */}
        <Text style={styles.sectionHeader}>PAGE MESSAGING CONTROLS</Text>
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>AI Autopilot Responder</Text>
              <Text style={styles.settingSubtitle}>
                AI agent answers customer inquiries instantly based on your company knowledge.
              </Text>
            </View>
            <Switch
              value={aiAutoResponder}
              onValueChange={handleToggleAutoResponder}
              trackColor={{ false: '#CBD5E1', true: '#0084FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={{ paddingTop: 6 }}>
            <Text style={styles.settingTitle}>Instant Welcome Greeting</Text>
            <Text style={styles.settingSubtitle}>
              Sent automatically the moment a user opens a new chat on your Facebook Page:
            </Text>
            <TextInput
              style={styles.greetingInput}
              value={greetingMessage}
              onChangeText={handleGreetingChange}
              multiline
              numberOfLines={3}
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
              <Text style={styles.disconnectBtnText}>Disconnect Messenger Channel</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.manualVerifyBtn, submitting && { opacity: 0.6 }]}
            onPress={connectMessenger}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <Text style={styles.manualVerifyText}>Mark as Connected (Direct API)</Text>
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
    borderColor: '#DBEAFE',
    marginBottom: 16,
    shadowColor: '#0084FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  messengerIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0084FF',
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  connectedPageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0084FF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  connectBtnText: {
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
  greetingInput: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 60,
    textAlignVertical: 'top',
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
  manualVerifyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  manualVerifyText: {
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
    color: '#0084FF',
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
});

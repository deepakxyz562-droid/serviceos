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
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

type InstagramConfig = {
  handle?: string;
  pageName?: string;
  aiAutoResponder?: boolean;
  triggerKeywords?: string;
  greetingMessage?: string;
  leadCaptureEnabled?: boolean;
  takeoverAlerts?: boolean;
};

export default function InstagramChannelScreen() {
  const router = useRouter();

  const [isConnected, setIsConnected] = useState(false);
  const [handle, setHandle] = useState('');
  const [aiAutoResponder, setAiAutoResponder] = useState(true);
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(true);
  const [triggerKeywords, setTriggerKeywords] = useState('price, book, quote, order, help, appointment');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [persistingConfig, setPersistingConfig] = useState(false);

  // Mirror of server-side config. The UI edits a subset (handle + 2 toggles +
  // keyword input) but we round-trip the rest so the web dashboard's settings
  // (greetingMessage, pageName, takeoverAlerts) are preserved when the mobile
  // app saves a toggle change.
  const configRef = useRef<InstagramConfig>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check real channel status
    apiRequest<any[]>(API_PATHS.channels)
      .then((channels) => {
        if (Array.isArray(channels)) {
          const ig = channels.find((c) => c.type === 'instagram' || c.channel === 'instagram');
          if (ig) {
            const cfg: InstagramConfig = (ig.config && typeof ig.config === 'object') ? ig.config : {};
            configRef.current = cfg;
            setIsConnected(!!ig.connected || ig.status === 'active');
            if (typeof cfg.handle === 'string') setHandle(cfg.handle);
            if (typeof cfg.triggerKeywords === 'string') setTriggerKeywords(cfg.triggerKeywords);
            if (typeof cfg.aiAutoResponder === 'boolean') setAiAutoResponder(cfg.aiAutoResponder);
            if (typeof cfg.leadCaptureEnabled === 'boolean') setLeadCaptureEnabled(cfg.leadCaptureEnabled);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildConfig = useCallback((): InstagramConfig => {
    return {
      ...configRef.current,
      handle,
      aiAutoResponder,
      leadCaptureEnabled,
      triggerKeywords,
    };
  }, [handle, aiAutoResponder, leadCaptureEnabled, triggerKeywords]);

  const persistConfig = useCallback(
    async (overrides?: Partial<InstagramConfig> & { connected?: boolean; status?: string }) => {
      const mergedConfig: InstagramConfig = { ...buildConfig(), ...(overrides || {}) };
      configRef.current = mergedConfig;
      const connected = overrides?.connected ?? isConnected;
      const status = overrides?.status ?? (connected ? 'active' : 'inactive');
      setPersistingConfig(true);
      try {
        await apiRequest(API_PATHS.channels, {
          method: 'POST',
          body: {
            channel: 'instagram',
            type: 'instagram',
            name: 'Instagram',
            provider: 'meta',
            connected,
            status,
            config: mergedConfig,
          },
        });
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to save Instagram settings.';
        Alert.alert('Save Failed', msg);
      } finally {
        setPersistingConfig(false);
      }
    },
    [buildConfig, isConnected]
  );

  const connectInstagram = useCallback(async () => {
    setSubmitting(true);
    try {
      const config: InstagramConfig = { ...buildConfig() };
      configRef.current = config;
      await apiRequest(API_PATHS.channels, {
        method: 'POST',
        body: {
          channel: 'instagram',
          type: 'instagram',
          name: 'Instagram',
          provider: 'meta',
          connected: true,
          status: 'active',
          config,
        },
      });
      setIsConnected(true);
      hapticFeedback.success();
      Alert.alert(
        'Instagram Connected',
        'Your Instagram Direct channel has been activated. If you have not yet completed the Meta OAuth in your web dashboard, please do so to enable live DM auto-reply.'
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to connect Instagram. Please try again.';
      Alert.alert('Connection Failed', msg);
    } finally {
      setSubmitting(false);
    }
  }, [buildConfig]);

  const handleConnectInstagram = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Connect Instagram Professional',
      'To connect your Instagram Direct Messages:\n\n1. Ensure your Instagram is switched to a Professional or Creator account.\n2. Ensure it is connected to your Facebook Business Page.\n3. Grant "instagram_manage_messages" permission.\n\nOpen Meta OAuth connection in browser?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Connect Meta OAuth',
          onPress: () => {
            const oauthUrl = `${API_BASE_URL}/api/oauth/instagram/callback`;
            Linking.openURL(oauthUrl).catch(() => {
              Alert.alert('Browser Error', 'Could not open Meta OAuth. Please try from your desktop dashboard or verify browser settings.');
            });
          },
        },
        {
          text: 'Mark Connected',
          onPress: () => {
            connectInstagram();
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

  const handleToggleLeadCapture = (val: boolean) => {
    hapticFeedback.light();
    setLeadCaptureEnabled(val);
    persistConfig({ leadCaptureEnabled: val });
  };

  const handleKeywordsChange = (val: string) => {
    setTriggerKeywords(val);
    // Debounce text-input persistence to avoid one POST per keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistConfig({ triggerKeywords: val });
    }, 700);
  };

  const handleDisconnect = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Disconnect Instagram',
      'Are you sure you want to disconnect Instagram Direct Messages? Your AI agent will stop answering customer DMs.',
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
                  channel: 'instagram',
                  type: 'instagram',
                  name: 'Instagram',
                  provider: 'meta',
                  connected: false,
                  status: 'inactive',
                  config: buildConfig(),
                },
              });
              setIsConnected(false);
              setHandle('');
              configRef.current = {};
            } catch (err) {
              const msg = err instanceof ApiError ? err.message : 'Failed to disconnect Instagram. Please try again.';
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
        <Text style={styles.headerTitle}>Instagram Direct</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.igIconCircle}>
            <FontAwesome name="instagram" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Automate Instagram Inquiries & DMs</Text>
          <Text style={styles.heroDesc}>
            Turn story replies, bio link clicks, and DM questions into qualified leads, orders, and booked appointments automatically with your 24/7 AI employee.
          </Text>

          {isConnected ? (
            <View style={styles.connectedPillRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedHandleText}>
                {handle ? `@${handle}` : 'Instagram Professional'} · Active & Linked
              </Text>
            </View>
          ) : submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#E1306C" />
              <Text style={styles.submittingText}>Connecting…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectMetaBtn}
              onPress={handleConnectInstagram}
              activeOpacity={0.8}
            >
              <FontAwesome name="instagram" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectMetaBtnText}>Connect Instagram Professional</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requirements Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checkTitle}>Requirements for Meta API:</Text>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Instagram Professional / Creator Account</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Linked to a Facebook Business Page</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>"Allow Access to Messages" enabled in Instagram Settings</Text>
          </View>
        </View>

        {/* Automation Settings */}
        <Text style={styles.sectionHeader}>DM AUTOMATION CONTROLS</Text>
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>AI Autopilot Responder</Text>
              <Text style={styles.settingSubtitle}>
                AI automatically replies to incoming DMs within 3 seconds using your business catalog and knowledge base.
              </Text>
            </View>
            <Switch
              value={aiAutoResponder}
              onValueChange={handleToggleAutoResponder}
              trackColor={{ false: '#CBD5E1', true: '#E1306C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>Auto-Qualify & Capture Leads</Text>
              <Text style={styles.settingSubtitle}>
                Ask for customer phone, name, and service need before handing off to human inbox.
              </Text>
            </View>
            <Switch
              value={leadCaptureEnabled}
              onValueChange={handleToggleLeadCapture}
              trackColor={{ false: '#CBD5E1', true: '#E1306C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={{ paddingTop: 8 }}>
            <Text style={styles.settingTitle}>Priority DM Trigger Keywords</Text>
            <Text style={styles.settingSubtitle}>
              When a follower sends any of these words, the AI triggers instant VIP response & booking link:
            </Text>
            <TextInput
              style={styles.keywordInput}
              value={triggerKeywords}
              onChangeText={handleKeywordsChange}
              placeholder="e.g. price, book, menu, quote, appointment"
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
              <Text style={styles.disconnectBtnText}>Disconnect Instagram Channel</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.manualVerifyBtn, submitting && { opacity: 0.6 }]}
            onPress={connectInstagram}
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
    borderColor: '#FCE7F3',
    marginBottom: 16,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  igIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E1306C',
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
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  connectedHandleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE185D',
  },
  connectMetaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
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
  keywordInput: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
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
    color: '#E1306C',
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
